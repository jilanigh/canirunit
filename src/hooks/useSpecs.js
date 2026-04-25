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
    // 1. Check if agent passed specs via URL query param (?specs=...)
    //    This is the primary path — agent opens the site with specs in the URL.
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('specs');
      if (raw) {
        const agentData = JSON.parse(decodeURIComponent(raw));
        if (agentData?.gpu) {
          const s = { ...agentData, method: 'agent', detected: true };
          saveAgentSpecs(s);
          setSpecs(s);
          // Clean the URL so specs don't sit in the address bar
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }
      }
    } catch {}

    // 2. Check localStorage — specs from a previous agent run
    const cached = loadAgentSpecs();
    if (cached && cached.method === 'agent') {
      setSpecs(cached);
      return;
    }

    // 3. Fall back to browser detection immediately so UI isn't blank
    detect();

    // 4. Poll localStorage every 2s as a last-resort fallback
    let retries = 0;
    const MAX_RETRIES = 30;
    const interval = setInterval(() => {
      retries++;
      if (retries > MAX_RETRIES) { clearInterval(interval); return; }
      const fresh = loadAgentSpecs();
      if (fresh && fresh.method === 'agent') {
        setSpecs(fresh);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
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
