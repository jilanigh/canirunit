export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Agent POSTs specs here — we just echo them back with success
  // The frontend polls this endpoint but storage happens client-side (localStorage)
  if (req.method === 'POST') {
    try {
      const { cpuName, gpu, cores, ram, os, storage, vram, shader } = req.body;
      if (!gpu && !cpuName) {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      const specs = { cpuName, gpu, cores, ram, os, storage, vram, shader, method: 'agent' };
      // Return the specs so the frontend can store them in localStorage
      return res.status(200).json({ success: true, specs });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to process specs' });
    }
  }

  // GET — just confirm the endpoint is alive (frontend polls to detect agent)
  if (req.method === 'GET') {
    return res.status(204).end();
  }

  res.status(405).json({ error: 'Method not allowed' });
}
