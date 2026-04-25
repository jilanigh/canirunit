// In-memory store — survives within a single serverless function instance
// On Vercel, cold-starts reset this, but the agent will re-POST on each run.
let latestSpecs = null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Agent POSTs specs here — we store them and echo back
  if (req.method === 'POST') {
    try {
      const { cpuName, gpu, cores, ram, os, storage, vram, shader } = req.body;
      if (!gpu && !cpuName) {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      latestSpecs = {
        cpuName, gpu, cores, ram, os, storage, vram, shader,
        method: 'agent',
        detected: true,
        postedAt: Date.now(),
      };
      return res.status(200).json({ success: true, specs: latestSpecs });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to process specs' });
    }
  }

  // GET — return the last specs the agent POSTed (null if none yet / cold start)
  if (req.method === 'GET') {
    if (latestSpecs) {
      return res.status(200).json({ specs: latestSpecs });
    }
    return res.status(204).end(); // no specs yet
  }

  res.status(405).json({ error: 'Method not allowed' });
}
