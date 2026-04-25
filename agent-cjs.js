import si from 'systeminformation';
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { execFileSync } from 'node:child_process';

// ─── Config ────────────────────────────────────────────────────────────────
const VERSION   = '1.1.0';
const SITE_URL  = 'https://can-you-run-it.vercel.app';
const LS_KEY    = 'cyri_agent_specs';
const TIMEOUT   = 8000;

// ─── ANSI Colors ───────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
  bgGreen:  '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed:    '\x1b[41m',
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function line(char = '─', len = 50) {
  return char.repeat(len);
}

function banner() {
  console.log('');
  console.log(C.cyan + C.bold + '╔' + line('═') + '╗' + C.reset);
  console.log(C.cyan + C.bold + '║' + C.reset + C.bold + '        CYRI Desktop Agent  v' + VERSION + '          ' + C.cyan + C.bold + '║' + C.reset);
  console.log(C.cyan + C.bold + '║' + C.reset + C.dim  + '        Can You Run It? — Hardware Scanner  ' + C.cyan + C.bold + '║' + C.reset);
  console.log(C.cyan + C.bold + '╚' + line('═') + '╝' + C.reset);
  console.log('');
}

function sectionHeader(title) {
  console.log('');
  console.log(C.cyan + '┌─ ' + C.bold + title + C.reset + C.cyan + ' ' + line('─', 35 - title.length) + C.reset);
}

function row(label, value, color = C.white) {
  const pad = label.padEnd(14);
  console.log(C.cyan + '│  ' + C.reset + C.dim + pad + C.reset + ' ' + color + C.bold + value + C.reset);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Animated dots while waiting
async function withSpinner(label, fn) {
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0;
  let done = false;
  const interval = setInterval(() => {
    process.stdout.write('\r' + C.cyan + frames[i % frames.length] + C.reset + '  ' + label + '  ');
    i++;
  }, 80);
  try {
    const result = await fn();
    done = true;
    clearInterval(interval);
    process.stdout.write('\r' + C.green + '✓' + C.reset + '  ' + label + '  \n');
    return result;
  } catch (err) {
    clearInterval(interval);
    process.stdout.write('\r' + C.red + '✗' + C.reset + '  ' + label + '  \n');
    throw err;
  }
}

// ─── Consent ───────────────────────────────────────────────────────────────
async function askConsent() {
  console.log(C.dim + line('─') + C.reset);
  console.log(C.bold + '  What this tool collects:' + C.reset);
  console.log(C.dim  + '  • CPU model and core count');
  console.log(        '  • GPU model and VRAM');
  console.log(        '  • Total RAM');
  console.log(        '  • Operating system name');
  console.log(        '  • Free disk storage');
  console.log('');
  console.log('  No personal data. No account required. No background tasks.' + C.reset);
  console.log(C.dim + line('─') + C.reset);
  console.log('');

  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(C.bold + '  Continue? (Y/n): ' + C.reset, answer => {
      rl.close();
      const ok = answer.trim().toLowerCase() !== 'n';
      if (!ok) {
        console.log('');
        console.log(C.yellow + '  Cancelled by user. No data was collected.' + C.reset);
        console.log('');
      }
      resolve(ok);
    });
  });
}

// ─── GPU Detection ─────────────────────────────────────────────────────────
function pickBestGpu(controllers) {
  if (!controllers || controllers.length === 0) return null;
  const dedicated = controllers.find(c => {
    const v = (c.vendor || '').toLowerCase();
    const m = (c.model  || '').toLowerCase();
    return (
      v.includes('nvidia') || v.includes('amd') || v.includes('arc') ||
      m.includes('rtx')    || m.includes('gtx') || m.includes('radeon')
    );
  });
  return dedicated || controllers[0];
}

function inferShader(gpuName) {
  const g = gpuName.toLowerCase();
  if (g.includes('rtx') || g.includes('rx 6') || g.includes('rx 7') || g.includes('arc')) return '6.0';
  if (g.includes('gtx') || g.includes('rx 5') || g.includes('rx 4')) return '5.1';
  return '5.0';
}

function cleanCpuName(cpu) {
  let name = cpu.brand.replace(/\(R\)|\(TM\)|Gen |®|™/gi, ' ').replace(/  +/g, ' ').trim();
  if (!name.toLowerCase().includes(cpu.manufacturer.toLowerCase())) {
    name = cpu.manufacturer + ' ' + name;
  }
  return name
    .replace(/Intel\s+Intel/gi, 'Intel')
    .replace(/AMD\s+AMD/gi, 'AMD')
    .trim();
}

// ─── Verdict Engine ────────────────────────────────────────────────────────
function isWsl() {
  if (process.platform !== 'linux') return false;
  if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) return true;

  try {
    return fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');
  } catch {
    return false;
  }
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function queryWindowsHardware() {
  try {
    const script = [
      '$gpu = Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM | ConvertTo-Json -Compress',
      '$os = Get-CimInstance Win32_OperatingSystem | Select-Object Caption, OSArchitecture | ConvertTo-Json -Compress',
      '[PSCustomObject]@{ gpu = ($gpu | ConvertFrom-Json); os = ($os | ConvertFrom-Json) } | ConvertTo-Json -Compress',
    ].join('; ');

    const output = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-Command', script],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();

    return tryParseJson(output);
  } catch {
    return null;
  }
}

function pickBestWindowsGpu(controllers) {
  if (!Array.isArray(controllers) || controllers.length === 0) return null;

  const score = (gpu) => {
    const name = (gpu?.Name || '').toLowerCase();
    let value = 0;

    if (name.includes('nvidia') || name.includes('geforce')) value += 100;
    if (name.includes('amd') || name.includes('radeon')) value += 100;
    if (name.includes('intel') || name.includes('arc')) value += 80;
    if (name.includes('rtx') || name.includes('gtx')) value += 120;
    if (name.includes('microsoft basic') || name.includes('hyper-v') || name.includes('remote display')) value -= 200;

    value += Math.round(Number(gpu?.AdapterRAM || 0) / (1024 ** 3));
    return value;
  };

  return [...controllers].sort((a, b) => score(b) - score(a))[0];
}

function getDesktopDir() {
  const candidates = [];

  if (process.env.XDG_DESKTOP_DIR) candidates.push(process.env.XDG_DESKTOP_DIR);
  candidates.push(path.join(os.homedir(), 'Desktop'));
  candidates.push(os.homedir());
  candidates.push(process.cwd());

  return candidates.find((dir) => {
    try {
      return dir && fs.existsSync(dir);
    } catch {
      return false;
    }
  }) || process.cwd();
}

function getVerdict(specs) {
  const issues   = [];
  const warnings = [];

  // Hard minimums
  if (specs.ram     < 4)  issues.push(`RAM critically low — ${specs.ram}GB detected, 4GB minimum`);
  if (specs.vram    < 1)  issues.push(`VRAM critically low — ${specs.vram}GB detected, 1GB minimum`);
  if (specs.cores   < 2)  issues.push(`CPU too weak — ${specs.cores} cores detected, 2 minimum`);
  if (specs.storage < 5)  issues.push(`Almost no free storage — ${specs.storage}GB free`);

  // Soft warnings (can run but will struggle)
  if (specs.ram     >= 4  && specs.ram     < 8)   warnings.push(`RAM is low (${specs.ram}GB) — 8GB+ recommended`);
  if (specs.vram    >= 1  && specs.vram    < 2)   warnings.push(`VRAM is low (${specs.vram}GB) — 2GB+ recommended for modern games`);
  if (specs.cores   >= 2  && specs.cores   < 4)   warnings.push(`CPU cores low (${specs.cores}) — 4+ cores recommended`);
  if (specs.storage >= 5  && specs.storage < 20)  warnings.push(`Low free storage (${specs.storage}GB) — 20GB+ recommended`);

  if (issues.length > 0) {
    return { level: 'CANNOT_RUN', label: '❌  CANNOT RUN', color: C.red,    issues, warnings };
  }
  if (warnings.length > 0) {
    return { level: 'MAY_STRUGGLE', label: '⚠️   MAY STRUGGLE', color: C.yellow, issues, warnings };
  }
  return { level: 'READY', label: '✅  READY TO GAME', color: C.green, issues, warnings };
}

function displayVerdict(result) {
  console.log('');
  const bg = result.level === 'READY'
    ? C.bgGreen : result.level === 'MAY_STRUGGLE'
    ? C.bgYellow : C.bgRed;

  console.log(bg + C.bold + '                                                  ' + C.reset);
  console.log(bg + C.bold + '    ' + result.label.padEnd(46) + C.reset);
  console.log(bg + C.bold + '                                                  ' + C.reset);

  if (result.issues.length > 0) {
    console.log('');
    console.log(C.red + C.bold + '  Critical issues:' + C.reset);
    result.issues.forEach(i => console.log(C.red + '  ✗  ' + C.reset + i));
  }

  if (result.warnings.length > 0) {
    console.log('');
    console.log(C.yellow + C.bold + '  Recommendations:' + C.reset);
    result.warnings.forEach(w => console.log(C.yellow + '  ▲  ' + C.reset + w));
  }

  if (result.level === 'READY') {
    console.log('');
    console.log(C.green + C.dim + '  Your system meets the requirements for most modern games.' + C.reset);
  }
}

// ─── Bridge HTML ───────────────────────────────────────────────────────────
function writeBridgeFile(specs) {
  const bridgePath = path.join(getDesktopDir(), 'CYRI-Open-This.html');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CYRI Agent — Loading your specs...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f0f13;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #1a1a2e;
      border: 1px solid #2d2d4e;
      border-radius: 16px;
      padding: 40px 48px;
      text-align: center;
      max-width: 480px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #a78bfa; }
    p  { color: #94a3b8; font-size: 14px; line-height: 1.6; }
    .bar {
      width: 100%;
      height: 4px;
      background: #2d2d4e;
      border-radius: 9999px;
      margin: 24px 0;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #7c3aed, #a78bfa);
      border-radius: 9999px;
      animation: progress 0.8s ease-in-out forwards;
    }
    @keyframes progress { from { width: 0% } to { width: 100% } }
    a { color: #a78bfa; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🖥️</div>
    <h1>Loading your specs...</h1>
    <p>Your hardware was detected successfully.<br>Redirecting to Can You Run It...</p>
    <div class="bar"><div class="bar-fill"></div></div>
    <p>If you are not redirected automatically,<br>
    <a href="${SITE_URL}">click here to open the site</a>.</p>
  </div>
  <script>
    localStorage.setItem('${LS_KEY}', JSON.stringify(${JSON.stringify(specs)}));
    setTimeout(() => window.location.href = '${SITE_URL}', 900);
  </script>
</body>
</html>`;

  fs.writeFileSync(bridgePath, html, 'utf8');
  return bridgePath;
}

// ─── Wait for keypress ─────────────────────────────────────────────────────
function waitForEnter() {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('');
    rl.question(C.dim + '  Press ENTER to close...' + C.reset, () => {
      rl.close();
      resolve();
    });
  });
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  // Catch any unhandled errors so window doesn't close silently
  process.on('uncaughtException', async (err) => {
    console.error('');
    console.error(C.red + '  Unexpected error: ' + err.message + C.reset);
    await waitForEnter();
    process.exit(1);
  });

  banner();

  // ── Consent ──
  const agreed = await askConsent();
  if (!agreed) {
    await waitForEnter();
    return;
  }

  console.log('');

  // ── Hardware Scan ──
  sectionHeader('Scanning Hardware');
  console.log('');

  let specs;
  try {
    const [cpu, graphics, mem, drives, osInfo] = await withSpinner(
      'Reading system information',
      () => Promise.all([
        si.cpu(),
        si.graphics(),
        si.mem(),
        si.fsSize(),
        si.osInfo(),
      ])
    );

    const bestGpu = pickBestGpu(graphics.controllers);
    let gpuName = bestGpu
      ? `${bestGpu.vendor || ''} ${bestGpu.model || ''}`.replace(/  +/g, ' ').trim()
      : 'Unknown GPU';
    let vramGB = bestGpu ? Math.round((bestGpu.vram || 0) / 1024) : 0;
    const ramGB     = Math.round(mem.total / (1024 ** 3));
    const finalCpu  = cleanCpuName(cpu);

    let maxStorageGB = 0;
    if (drives && drives.length > 0) {
      const best = drives.reduce((p, c) => p.available > c.available ? p : c);
      maxStorageGB = Math.round(best.available / (1024 ** 3));
    }

    let osName = osInfo.distro.replace('Microsoft ', '').replace(/ Professionnel| Pro| Home/gi, '').trim();
    if (osInfo.arch === 'x64') osName += ' 64-bit';

    if (isWsl()) {
      const windowsHardware = queryWindowsHardware();
      const windowsGpu = pickBestWindowsGpu(
        Array.isArray(windowsHardware?.gpu) ? windowsHardware.gpu : [windowsHardware?.gpu].filter(Boolean)
      );

      if (windowsGpu?.Name) {
        gpuName = windowsGpu.Name.trim();
        vramGB = Math.round(Number(windowsGpu.AdapterRAM || 0) / (1024 ** 3));
      }

      if (windowsHardware?.os?.Caption) {
        osName = windowsHardware.os.Caption.replace('Microsoft ', '').trim();
        if (windowsHardware.os.OSArchitecture) {
          osName += ` ${windowsHardware.os.OSArchitecture}`;
        }
      } else if (!osName) {
        osName = 'Windows (via WSL)';
      }
    }

    const shader = inferShader(gpuName);

    specs = {
      cpuName:  finalCpu,
      gpu:      gpuName,
      cores:    cpu.physicalCores || cpu.cores || 4,
      ram:      ramGB,
      os:       osName,
      storage:  maxStorageGB,
      vram:     vramGB,
      shader:   shader,
      method:   'agent',
      detected: true,
      scannedAt: new Date().toISOString(),
    };

  } catch (err) {
    console.error('');
    console.error(C.red + '  ✗ Hardware scan failed: ' + err.message + C.reset);
    console.error(C.dim + '  Try running as Administrator.' + C.reset);
    await waitForEnter();
    return;
  }

  // ── Display Results ──
  sectionHeader('Detected Specifications');
  console.log('');
  row('Processor',  `${specs.cpuName} (${specs.cores} cores)`);
  row('GPU',        `${specs.gpu} (${specs.vram} GB VRAM)`);
  row('RAM',        `${specs.ram} GB`);
  row('OS',         specs.os);
  row('Free Space', `${specs.storage} GB`);
  row('Shader',     `DirectX Shader Model ${specs.shader}`);
  console.log(C.cyan + '└' + line('─', 49) + C.reset);

  // ── Verdict ──
  sectionHeader('Compatibility Verdict');
  const verdict = getVerdict(specs);
  displayVerdict(verdict);

  // ── Sync to server (best effort) ──
  console.log('');
  sectionHeader('Syncing to Site');
  console.log('');

  let serverOk = false;
  try {
    const res = await withSpinner(
      'Sending specs to server',
      () => axios.post(`${SITE_URL}/api/agent/sync`, specs, { timeout: TIMEOUT })
    );
    if (res.status === 200) serverOk = true;
  } catch {
    process.stdout.write('\r' + C.yellow + '▲' + C.reset + '  Server unreachable — using local bridge file\n');
  }

  // ── Bridge File ──
  let bridgePath;
  try {
    bridgePath = writeBridgeFile(specs);
  } catch (err) {
    console.error(C.red + '  Could not write bridge file: ' + err.message + C.reset);
  }

  // ── Final Instructions ──
  console.log('');
  console.log(C.cyan + C.bold + '╔' + line('═') + '╗' + C.reset);
  if (serverOk) {
    console.log(C.cyan + C.bold + '║' + C.reset + C.green + C.bold + '  ✅ Specs synced! Open the site to see results.    ' + C.cyan + C.bold + '║' + C.reset);
  } else if (bridgePath) {
    console.log(C.cyan + C.bold + '║' + C.reset + C.bold + '  📂 A file was saved to your Desktop:             ' + C.cyan + C.bold + '║' + C.reset);
    console.log(C.cyan + C.bold + '║' + C.reset + C.yellow + C.bold + '     CYRI-Open-This.html                           ' + C.cyan + C.bold + '║' + C.reset);
    console.log(C.cyan + C.bold + '║' + C.reset + C.dim +   '                                                  ' + C.cyan + C.bold + '║' + C.reset);
    console.log(C.cyan + C.bold + '║' + C.reset + C.bold + '  👉 Open it in your browser to see your results.  ' + C.cyan + C.bold + '║' + C.reset);
  } else {
    console.log(C.cyan + C.bold + '║' + C.reset + C.red + '  Could not sync or write bridge file.             ' + C.cyan + C.bold + '║' + C.reset);
  }
  console.log(C.cyan + C.bold + '╚' + line('═') + '╝' + C.reset);

  await waitForEnter();
}

main();
