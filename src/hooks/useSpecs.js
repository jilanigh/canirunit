import { useState, useEffect, createContext, useContext } from 'react';
import { compareGpu } from '../data/gpuScoring';

// ── Context so any component can read specs without prop drilling ──────────────
export const SpecsContext = createContext(null);

export function useSpecsContext() {
  return useContext(SpecsContext);
}

const LS_KEY = 'cyri_agent_specs';

// ── Browser-level detection helpers ───────────────────────────────────────────
function detectGPU() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'Unknown GPU';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return 'Unknown GPU';
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    return renderer.length > 40 ? renderer.substring(0, 40) + '…' : renderer;
  } catch {
    return 'Unknown GPU';
  }
}

function detectOS() {
  const ua = navigator.userAgent;
  if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
  if (/Windows NT 6/.test(ua)) return 'Windows 8/7';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  return 'Unknown OS';
}

function loadAgentSpecs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveAgentSpecs(specs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(specs));
  } catch {}
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useSpecs() {
  const [specs, setSpecs] = useState({
    gpu: null, cores: null, ram: null, os: null,
    storage: null, detected: false, method: 'browser',
  });

  const detect = () => {
    // Don't overwrite high-quality agent data with browser guesses
    if (specs.method === 'agent') return;
    const gpu = detectGPU();
    const cores = navigator.hardwareConcurrency || null;
    const ram = navigator.deviceMemory || null;
    const os = detectOS();
    setSpecs({ gpu, cores, ram, os, storage: null, detected: true, method: 'browser' });
  };

  const applyAgentSpecs = (agentData) => {
    const s = {
      cpuName:  agentData.cpuName,
      gpu:      agentData.gpu,
      cores:    agentData.cores,
      ram:      agentData.ram,
      os:       agentData.os,
      storage:  agentData.storage,
      vram:     agentData.vram,
      shader:   agentData.shader,
      detected: true,
      method:   'agent',
    };
    saveAgentSpecs(s);
    setSpecs(s);
  };

  useEffect(() => {
    // 1. Check localStorage first — agent may have synced via bridge HTML
    const cached = loadAgentSpecs();
    if (cached && cached.method === 'agent') {
      setSpecs(cached);
      return;
    }

    // 2. Fall back to browser detection immediately so UI isn't blank
    detect();

    // 3. Listen on BroadcastChannel — bridge HTML posts specs here instantly
    //    when it opens in any tab on the same origin. This is the fast path.
    let bc;
    try {
      bc = new BroadcastChannel('cyri_agent_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'SPECS_READY' && event.data?.specs) {
          saveAgentSpecs(event.data.specs);
          setSpecs(event.data.specs);
        }
      };
    } catch {}

    // 4. Poll localStorage + API as fallback (bridge may not broadcast in all browsers)
    let retries = 0;
    const MAX_RETRIES = 30;

    const interval = setInterval(async () => {
      retries++;
      if (retries > MAX_RETRIES) {
        clearInterval(interval);
        return;
      }

      // 4a. Re-check localStorage (bridge HTML writes here)
      const fresh = loadAgentSpecs();
      if (fresh && fresh.method === 'agent') {
        setSpecs(fresh);
        clearInterval(interval);
        return;
      }

      // 4b. Poll the server endpoint (direct POST path from agent)
      try {
        const res = await fetch('/api/agent/sync');
        if (res.status === 200) {
          const data = await res.json();
          if (data?.specs?.method === 'agent') {
            saveAgentSpecs(data.specs);
            setSpecs(data.specs);
            clearInterval(interval);
          }
        }
      } catch {}
    }, 2000);

    return () => {
      clearInterval(interval);
      try { bc?.close(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { specs, redetect: detect, applyAgentSpecs };
}

// ── Compatibility helper (used by GameCard & GameDetail) ──────────────────────
export function getCompatibility(game, specs) {
  if (!specs?.detected) return 'unknown';

  const userRam = specs.ram || 8;
  const userCores = specs.cores || 4;
  const userGpu = specs.gpu || '';

  const getVal = (type, field, fallback) => {
    if (game[type] && typeof game[type] === 'object' && game[type][field]) {
      return game[type][field];
    }
    return game[`${type}${field.charAt(0).toUpperCase()}${field.slice(1)}`] || fallback;
  };

  const minRam = getVal('minimum', 'ram', 8);
  const minGpu = getVal('minimum', 'gpu', 'GTX 1050');
  const recRam = getVal('recommended', 'ram', 16);
  const recGpu = getVal('recommended', 'gpu', 'RTX 2060');

  const meetsRecGpu = compareGpu(userGpu, recGpu);
  const meetsMinGpu = compareGpu(userGpu, minGpu);

  if (userRam >= recRam && meetsRecGpu) return 'recommended';
  if (userRam >= minRam && meetsMinGpu) return 'minimum';
  return 'incompatible';
}
