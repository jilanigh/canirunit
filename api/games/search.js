import axios from 'axios';

let accessToken = null;
let tokenExpiry = null;

function getEnv(key) {
  return process.env[key] || process.env[`VITE_${key}`] || '';
}

async function getToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const clientId     = getEnv('IGDB_CLIENT_ID');
  const clientSecret = getEnv('IGDB_CLIENT_SECRET');

  if (!clientId || !clientSecret) throw new Error('IGDB credentials not configured');

  const res = await axios.post(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    null,
    { timeout: 8000 }
  );
  accessToken = res.data.access_token;
  tokenExpiry = Date.now() + res.data.expires_in * 1000 - 60000;
  return accessToken;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST')    { return res.status(405).json({ error: 'Method not allowed' }); }

  try {
    const { query } = req.body || {};
    if (!query || !query.trim()) return res.status(400).json({ error: 'Query is required' });

    const token    = await getToken();
    const clientId = getEnv('IGDB_CLIENT_ID');

    // Escape quotes in user query to prevent IGDB query injection
    const safeQuery = query.replace(/"/g, '');

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `fields name, cover.url, screenshots.url, genres.name,
              external_games.uid, external_games.category;
       search "${safeQuery}";
       where cover != null;
       limit 50;`,
      {
        headers: {
          'Client-ID':     clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'text/plain',
        },
        timeout: 10000,
      }
    );

    const games = response.data.map(game => ({
      id:          game.id,
      name:        game.name,
      cover:       game.cover ? { url: game.cover.url } : null,
      screenshots: (game.screenshots || []).map(s => ({ url: s.url })),
      genre:       game.genres?.[0]?.name || null,
      steamId:     game.external_games?.find(ex => ex.category === 1)?.uid || null,
    }));

    return res.status(200).json(games);
  } catch (error) {
    console.error('[search] error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to search games', detail: error.message });
  }
}
