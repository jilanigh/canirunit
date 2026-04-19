import si from 'systeminformation';
import axios from 'axios';

async function scanAndSync() {
  console.log('🔍 Booting CYRI Desktop Agent...');
  console.log('-----------------------------------');
  console.log('⏳ Scanning system hardware...');

  try {
    const cpu = await si.cpu();
    const graphics = await si.graphics();
    
    // Improved GPU Selection: Always prioritize dedicated cards
    let bestGpu = graphics.controllers[0];
    const dedicated = graphics.controllers.find(c => {
      const v = (c.vendor || '').toLowerCase();
      const m = (c.model || '').toLowerCase();
      return v.includes('nvidia') || v.includes('amd') || v.includes('arc') || 
             m.includes('rtx') || m.includes('gtx') || m.includes('radeon');
    });

    if (dedicated) {
      bestGpu = dedicated;
    }

    const gpuName = bestGpu ? `${bestGpu.vendor || ''} ${bestGpu.model || ''}`.replace(/  +/g, ' ').trim() : 'Unknown GPU';
    const vramGB = bestGpu ? Math.round(bestGpu.vram / 1024) : 0;
    
    console.log(`🎯 TARGET GPU: ${gpuName} (${vramGB}GB VRAM)`);

    let shader = "5.0";
    const gpuLower = gpuName.toLowerCase();
    if (gpuLower.includes('rtx') || gpuLower.includes('rx 6') || gpuLower.includes('rx 7') || gpuLower.includes('arc')) {
      shader = "6.0";
    } else if (gpuLower.includes('gtx') || gpuLower.includes('rx 5') || gpuLower.includes('rx 4')) {
      shader = "5.1";
    }
    
    const mem = await si.mem();
    const ramGB = Math.round(mem.total / (1024 ** 3));
    
    const drives = await si.fsSize();
    let maxStorageGB = 0;
    if (drives && drives.length > 0) {
      const bestDrive = drives.reduce((prev, curr) => (prev.available > curr.available) ? prev : curr);
      maxStorageGB = Math.round(bestDrive.available / (1024 ** 3));
    }

    const osInfo = await si.osInfo();
    let osName = osInfo.distro.replace('Microsoft ', '').replace(/ Professionnel| Pro| Home/gi, '').trim();
    if (osInfo.arch === 'x64') {
      osName += ' 64-bit';
    }

    // Clean up CPU Name: Remove redundancy
    let cleanCpu = cpu.brand.replace(/\(R\)|\(TM\)|Gen |®|™/gi, ' ').replace(/  +/g, ' ').trim();
    if (!cleanCpu.toLowerCase().includes(cpu.manufacturer.toLowerCase())) {
      cleanCpu = cpu.manufacturer + ' ' + cleanCpu;
    }
    const finalCpuName = cleanCpu.replace(/Intel\s+Intel/gi, 'Intel').replace(/AMD\s+AMD/gi, 'AMD').trim();

    const payload = {
      cpuName: finalCpuName,
      gpu: gpuName,
      cores: cpu.physicalCores || cpu.cores || 4,
      ram: ramGB,
      os: osName,
      storage: maxStorageGB,
      vram: vramGB,
      shader: shader
    };

    console.log('\n✅ Scan Complete! Detected:');
    console.log(`  Processor: ${finalCpuName} (${payload.cores} Cores)`);
    console.log(`  Memory: ${ramGB} GB RAM`);
    console.log(`  OS: ${osName}`);
    console.log(`  Free Storage: ${maxStorageGB} GB`);

    console.log('\n📡 Syncing with web portal...');
    const syncRes = await axios.post('http://localhost:5000/api/agent/sync', payload);
    if (syncRes.status === 200) {
      console.log('SUCCESS: Your local specs are now live on the site!');
    }
  } catch (err) {
    console.error('Error during scan/sync:', err.message);
  }

  console.log('\n(Leave this window open to keep specs updated. Polling every 60s...)');
}

scanAndSync();
setInterval(scanAndSync, 60000);
