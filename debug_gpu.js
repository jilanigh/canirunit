import si from 'systeminformation';

async function debug() {
  console.log('--- GPU DEBUG START ---');
  try {
    const graphics = await si.graphics();
    console.log('Controllers detected:', graphics.controllers.length);
    graphics.controllers.forEach((c, i) => {
      console.log(`Controller [${i}]:`);
      console.log(`  Vendor: ${c.vendor}`);
      console.log(`  Model: ${c.model}`);
      console.log(`  Bus: ${c.bus}`);
      console.log(`  VRAM: ${c.vram}`);
      console.log(`  Device ID: ${c.deviceId}`);
    });
  } catch (err) {
    console.error('Debug failed:', err);
  }
  console.log('--- GPU DEBUG END ---');
}

debug();
