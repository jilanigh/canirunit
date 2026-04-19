import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let { steamId, gameName } = req.query;

  try {
    if (!steamId && gameName) {
      const searchRes = await axios.get(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=english&cc=US`);
      if (searchRes.data?.items?.length > 0) {
        steamId = searchRes.data.items[0].id;
      }
    }

    if (!steamId) {
      return res.status(400).json({ error: 'steamId or valid gameName is required' });
    }

    const response = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${steamId}`);
    const data = response.data[steamId];

    if (!data.success) {
      return res.status(404).json({ error: 'Game not found on Steam' });
    }

    const pcRequirements = data.data.pc_requirements;
    if (!pcRequirements) {
      return res.status(404).json({ error: 'No PC requirements found on Steam' });
    }

    function parseRequirements(html) {
      if (!html) return null;
      const stripHtml = (str) => str.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      const clean = stripHtml(html);

      // Robust parsing using negative lookahead for major category keywords
      // Stops matching once it hits "Memory:", "Graphics:", "Storage:", etc.
      const categoryStop = '(?:Memory|Graphics|GPU|RAM|Storage|Disk|Space|Sound|DirectX|Other)';
      
      const cpuRegex = new RegExp(`(?:Processor|CPU):\\s*((?:(?!${categoryStop}).)+)`, 'i');
      const gpuRegex = new RegExp(`(?:Graphics|Video Card|GPU):\\s*((?:(?!${categoryStop}).)+)`, 'i');
      
      const cpuMatch = clean.match(cpuRegex);
      const gpuMatch = clean.match(gpuRegex);
      const ramMatch = clean.match(/(\d+)\s*(?:GB|GB RAM|Go|Go RAM|gigabytes)/i);
      const storageMatch = clean.match(/(?:Storage|Disk|Space|Hard Drive|Hard Disk):\s*(\d+)\s*(?:GB|Go|Go RAM|gigabytes)/i) || 
                           clean.match(/(\d+)\s*(?:GB|Go|Go RAM|gigabytes)(?:\s*(?:available\s*space|free))/i);

      let cores = 4;
      const lower = clean.toLowerCase();
      if (lower.includes('i3') || lower.includes('ryzen 3') || lower.includes('dual core') || lower.includes('2 core')) cores = 2;
      if (lower.includes('i7') || lower.includes('ryzen 7') || lower.includes('octa core') || lower.includes('8 core')) cores = 8;
      if (lower.includes('i9') || lower.includes('ryzen 9') || lower.includes('12 core')) cores = 12;

      return {
        ram: ramMatch ? parseInt(ramMatch[1]) : null,
        gpu: gpuMatch ? gpuMatch[1].trim() : null,
        cpu: cpuMatch ? cpuMatch[1].trim() : null,
        cores: cores,
        storage: storageMatch ? parseInt(storageMatch[1]) : null,
        raw: clean
      };
    }

    const min = parseRequirements(pcRequirements.minimum);
    const rec = parseRequirements(pcRequirements.recommended);

    res.status(200).json({
      minimum: min,
      recommended: rec,
      steamId: steamId
    });
  } catch (error) {
    console.error('Core API Error:', error.message);
    res.status(500).json({ error: 'Failed to process game requirements' });
  }
}
