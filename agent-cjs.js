const si = require('systeminformation');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { exec } = require('child_process');

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

function line(char = '─', len = 50) { return char.repeat(len); }

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

function row(label, value) {
  const pad = label.padEnd(14);
  console.log(C.cyan + '│  ' + C.reset + C.dim + pad + C.reset + ' ' + C.bold + value + C.reset);
}

async function withSpinner(label, fn) {
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write('\r' + C.cyan + frames[i % frames.length] + C.reset + '  ' + label + '  ');
    i++;
  }, 80);
  try {
    const result = await fn();
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
  console.log(C.dim + '  • CPU model and core count\n  • GPU model and VRAM\n  • Total RAM\n  • Operating system\n  • Free disk storage');
  console.log('');
  console.log('  No personal data. No background tasks.' + C.reset);
  console.log(C.dim + line('─') + C.reset);
  console.log('');
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(C.bold + '  Continue? (Y/n): ' + C.reset, answer => {
      rl.close();
      const ok = answer.trim().toLowerCase() !== 'n';
      if (!ok) console.log('\n' + C.yellow + '  Cancelled. No data collected.' + C.reset + '\n');
      resolve(ok);
    });
  });
}

// ─── GPU helpers ───────────────────────────────────────────────────────────
function pickBestGpu(controllers) {
  if (!controllers || controllers.length === 0) return null;
  const dedicated = controllers.find(c => {
    const v = (c.vendor || '').toLowerCase();
    const m = (c.model  || '').toLowerCase();
    return v.includes('nvidia') || v.includes('amd') || v.includes('arc') ||
           m.includes('rtx')   || m.includes('gtx') || m.includes('radeon');
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
  if (!name.toLowerCase().includes(cpu.manufacturer.toLowerCase())) name = cpu.manufacturer + ' ' + name;
  return name.replace(/Intel\s+Intel/gi, 'Intel').replace(/AMD\s+AMD/gi, 'AMD').trim();
}

// ─── Verdict ───────────────────────────────────────────────────────────────
function getVerdict(specs) {
  const issues = [], warnings = [];
  if (specs.ram     < 4)  issues.push(`RAM critically low — ${specs.ram}GB (need 4GB+)`);
  if (specs.vram    < 1)  issues.push(`VRAM critically low — ${specs.vram}GB (need 1GB+)`);
  if (specs.cores   < 2)  issues.push(`CPU too weak — ${specs.cores} cores (need 2+)`);
  if (specs.storage < 5)  issues.push(`Almost no free storage — ${specs.storage}GB`);
  if (specs.ram   >= 4  && specs.ram   < 8)  warnings.push(`RAM low (${specs.ram}GB) — 8GB+ recommended`);
  if (specs.vram  >= 1  && specs.vram  < 2)  warnings.push(`VRAM low (${specs.vram}GB) — 2GB+ recommended`);
  if (specs.cores >= 2  && specs.cores < 4)  warnings.push(`CPU cores low (${specs.cores}) — 4+ recommended`);
  if (specs.storage >= 5 && specs.storage < 20) warnings.push(`Low free storage (${specs.storage}GB) — 20GB+ recommended`);
  if (issues.length > 0)   return { level: 'CANNOT_RUN',   label: '❌  CANNOT RUN',    color: C.red,    bgColor: C.bgRed,    issues, warnings };
  if (warnings.length > 0) return { level: 'MAY_STRUGGLE', label: '⚠️   MAY STRUGGLE',  color: C.yellow, bgColor: C.bgYellow, issues, warnings };
  return                          { level: 'READY',         label: '✅  READY TO GAME', color: C.green,  bgColor: C.bgGreen,  issues, warnings };
}

function displayVerdict(result) {
  console.log('');
  console.log(result.bgColor + C.bold + '                                                  ' + C.reset);
  console.log(result.bgColor + C.bold + '    ' + result.label.padEnd(46) + C.reset);
  console.log(result.bgColor + C.bold + '                                                  ' + C.reset);
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
    console.log(C.green + C.dim + '  Your system meets requirements for most modern games.' + C.reset);
  }
}

// ─── Bridge HTML ───────────────────────────────────────────────────────────
function writeBridgeFile(specs) {
  const bridgePath = path.join(os.homedir(), 'Desktop', 'CYRI-Open-This.html');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CYRI Agent — Loading your specs...</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#0f0f13; color:#e2e8f0; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#1a1a2e; border:1px solid #2d2d4e; border-radius:16px; padding:40px 48px; text-align:center; max-width:480px; width:90%; box-shadow:0 20px 60px rgba(0,0,0,.5); }
    .icon { font-size:48px; margin-bottom:16px; }
    h1 { font-size:22px; font-weight:700; margin-bottom:8px; color:#a78bfa; }
    p { color:#94a3b8; font-size:14px; line-height:1.6; }
    .bar { width:100%; height:4px; background:#2d2d4e; border-radius:9999px; margin:24px 0; overflow:hidden; }
    .bar-fill { height:100%; background:linear-gradient(90deg,#7c3aed,#a78bfa); border-radius:9999px; animation:progress 0.8s ease-in-out forwards; }
    @keyframes progress { from{width:0%} to{width:100%} }
    a { color:#a78bfa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🖥️</div>
    <h1>Loading your specs...</h1>
    <p>Hardware detected! Redirecting to Can You Run It...</p>
    <div class="bar"><div class="bar-fill"></div></div>
    <p>Not redirected? <a href="${SITE_URL}">Click here</a>.</p>
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

// ─── Auto-open bridge file in default browser ──────────────────────────────
function openInBrowser(filePath) {
  // Use start on Windows to open the HTML file in the default browser
  exec(`start "" "${filePath}"`, (err) => {
    if (err) {
      // Fallback: try explorer
      exec(`explorer "${filePath}"`);
    }
  });
}

// ─── Wait for enter ────────────────────────────────────────────────────────
function waitForEnter() {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('');
    rl.question(C.dim + '  Press ENTER to close...' + C.reset, () => { rl.close(); resolve(); });
  });
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  process.on('uncaughtException', async (err) => {
    console.error('\n' + C.red + '  Unexpected error: ' + err.message + C.reset);
    await waitForEnter();
    process.exit(1);
  });

  banner();

  const agreed = await askConsent();
  if (!agreed) { await waitForEnter(); return; }

  console.log('');
  sectionHeader('Scanning Hardware');
  console.log('');

  let specs;
  try {
    const [cpu, graphics, mem, drives, osInfo] = await withSpinner(
      'Reading system information',
      () => Promise.all([si.cpu(), si.graphics(), si.mem(), si.fsSize(), si.osInfo()])
    );

    const bestGpu   = pickBestGpu(graphics.controllers);
    const gpuName   = bestGpu ? `${bestGpu.vendor || ''} ${bestGpu.model || ''}`.replace(/  +/g, ' ').trim() : 'Unknown GPU';
    const vramGB    = bestGpu ? Math.round((bestGpu.vram || 0) / 1024) : 0;
    const ramGB     = Math.round(mem.total / (1024 ** 3));
    const finalCpu  = cleanCpuName(cpu);
    let maxStorageGB = 0;
    if (drives && drives.length > 0) {
      const best = drives.reduce((p, c) => p.available > c.available ? p : c);
      maxStorageGB = Math.round(best.available / (1024 ** 3));
    }
    let osName = osInfo.distro.replace('Microsoft ', '').replace(/ Professionnel| Pro| Home/gi, '').trim();
    if (osInfo.arch === 'x64') osName += ' 64-bit';

    specs = {
      cpuName:   finalCpu,
      gpu:       gpuName,
      cores:     cpu.physicalCores || cpu.cores || 4,
      ram:       ramGB,
      os:        osName,
      storage:   maxStorageGB,
      vram:      vramGB,
      shader:    inferShader(gpuName),
      method:    'agent',
      detected:  true,
      scannedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('\n' + C.red + '  ✗ Scan failed: ' + err.message + C.reset);
    console.error(C.dim + '  Try running as Administrator.' + C.reset);
    await waitForEnter();
    return;
  }

  // ── Display specs ──
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

  // ── Sync to Vercel API (best effort) ──
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
    process.stdout.write('\r' + C.yellow + '▲' + C.reset + '  Server unreachable — opening bridge file instead\n');
  }

  // ── Write bridge file and AUTO-OPEN it ──
  let bridgePath;
  try {
    bridgePath = writeBridgeFile(specs);
  } catch (err) {
    console.error(C.red + '  Could not write bridge file: ' + err.message + C.reset);
  }

  // Always auto-open the bridge — it sets localStorage AND redirects to the site
  if (bridgePath) {
    console.log('');
    await withSpinner('Opening site in your browser', async () => {
      openInBrowser(bridgePath);
      // Small delay so spinner shows before window opens
      await new Promise(r => setTimeout(r, 1200));
    });
  }

  // ── Final message ──
  console.log('');
  console.log(C.cyan + C.bold + '╔' + line('═') + '╗' + C.reset);
  console.log(C.cyan + C.bold + '║' + C.reset + C.green + C.bold + '  ✅ Done! Your browser should now show the site.  ' + C.cyan + C.bold + '║' + C.reset);
  console.log(C.cyan + C.bold + '║' + C.reset + C.dim   + '  Your specs are loaded — search for any game!     ' + C.cyan + C.bold + '║' + C.reset);
  console.log(C.cyan + C.bold + '╚' + line('═') + '╝' + C.reset);

  await waitForEnter();
}

main();
