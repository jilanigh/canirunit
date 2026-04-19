const si = require('systeminformation');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SITE_URL = 'https://can-you-run-it.vercel.app';
const LS_KEY = 'cyri_agent_specs';

// Write a tiny HTML bridge file that injects specs into localStorage
// then redirects to the site — user just opens this file in their browser
function writeBridgeFile(specs) {
  const bridgePath = path.join(os.homedir(), 'Desktop', 'CYRI-Open-This.html');
  const html = `<!DOCTYPE html>
<html>
<head><title>CYRI Agent - Loading your specs...</title></head>
<body>
<p style="font-family:sans-serif;text-align:center;margin-top:40px">
  ✅ Specs detected! Redirecting to Can You Run It...<br>
  <small style="color:#888">If you are not redirected, <a href="${SITE_URL}">click here</a>.</small>
</p>
<script>
  localStorage.setItem('${LS_KEY}', JSON.stringify(${JSON.stringify(specs)}));
  setTimeout(() => window.location.href = '${SITE_URL}', 800);
</script>
</body>
</html>`;
  fs.writeFileSync(bridgePath, html);
  return bridgePath;
}

async function scanAndSync() {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║      CYRI Desktop Agent v1.0         ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log('⏳ Scanning your hardware...');

  try {
    const cpu      = await si.cpu();
    const graphics = await si.graphics();
    const mem      = await si.mem();
    const drives   = await si.fsSize();
    const osInfo   = await si.osInfo();

    // Best GPU selection
    let bestGpu = graphics.controllers[0];
    const dedicated = graphics.controllers.find(c => {
      const v = (c.vendor || '').toLowerCase();
      const m = (c.model || '').toLowerCase();
      return v.includes('nvidia') || v.includes('amd') || v.includes('arc') ||
             m.includes('rtx') || m.includes('gtx') || m.includes('radeon');
    });
    if (dedicated) bestGpu = dedicated;

    const gpuName = bestGpu
      ? `${bestGpu.vendor || ''} ${bestGpu.model || ''}`.replace(/  +/g, ' ').trim()
      : 'Unknown GPU';
    const vramGB = bestGpu ? Math.round((bestGpu.vram || 0) / 1024) : 0;

    let shader = '5.0';
    const gpuLower = gpuName.toLowerCase();
    if (gpuLower.includes('rtx') || gpuLower.includes('rx 6') || gpuLower.includes('rx 7') || gpuLower.includes('arc')) shader = '6.0';
    else if (gpuLower.includes('gtx') || gpuLower.includes('rx 5') || gpuLower.includes('rx 4')) shader = '5.1';

    const ramGB = Math.round(mem.total / (1024 ** 3));

    let maxStorageGB = 0;
    if (drives && drives.length > 0) {
      const best = drives.reduce((p, c) => p.available > c.available ? p : c);
      maxStorageGB = Math.round(best.available / (1024 ** 3));
    }

    let osName = osInfo.distro.replace('Microsoft ', '').replace(/ Professionnel| Pro| Home/gi, '').trim();
    if (osInfo.arch === 'x64') osName += ' 64-bit';

    let cleanCpu = cpu.brand.replace(/\(R\)|\(TM\)|Gen |®|™/gi, ' ').replace(/  +/g, ' ').trim();
    if (!cleanCpu.toLowerCase().includes(cpu.manufacturer.toLowerCase())) cleanCpu = cpu.manufacturer + ' ' + cleanCpu;
    const finalCpuName = cleanCpu.replace(/Intel\s+Intel/gi, 'Intel').replace(/AMD\s+AMD/gi, 'AMD').trim();

    const specs = {
      cpuName: finalCpuName,
      gpu:     gpuName,
      cores:   cpu.physicalCores || cpu.cores || 4,
      ram:     ramGB,
      os:      osName,
      storage: maxStorageGB,
      vram:    vramGB,
      shader:  shader,
      method:  'agent',
      detected: true,
    };

    console.log('');
    console.log('✅ Scan Complete!');
    console.log(`   CPU     : ${finalCpuName} (${specs.cores} cores)`);
    console.log(`   GPU     : ${gpuName} (${vramGB} GB VRAM)`);
    console.log(`   RAM     : ${ramGB} GB`);
    console.log(`   OS      : ${osName}`);
    console.log(`   Storage : ${maxStorageGB} GB free`);
    console.log('');

    // Also try sending to the server (best effort)
    try {
      await axios.post(`${SITE_URL}/api/agent/sync`, specs, { timeout: 8000 });
      console.log('📡 Specs sent to server successfully.');
    } catch {
      console.log('⚠️  Could not reach server — using local bridge file instead.');
    }

    // Write the bridge HTML file to Desktop
    const bridgePath = writeBridgeFile(specs);
    console.log('');
    console.log('══════════════════════════════════════════');
    console.log('  📂 A file was saved to your Desktop:');
    console.log(`     CYRI-Open-This.html`);
    console.log('');
    console.log('  👉 Open that file in your browser to');
    console.log('     load your specs on the site!');
    console.log('══════════════════════════════════════════');
    console.log('');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('Please make sure you are running as Administrator and try again.');
  }
}

scanAndSync();
