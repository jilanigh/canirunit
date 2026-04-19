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

// Fetch one page of games from IGDB (max 500 per request enforced by API)
async function fetchPage(token, clientId, offset) {
  const response = await axios.post(
    'https://api.igdb.com/v4/games',
    `fields name, cover.url, genres.name, external_games.uid, external_games.category;
     where rating > 70 & cover != null & platforms = (6);
     sort rating_count desc;
     limit 500;
     offset ${offset};`,
    {
      headers: {
        'Client-ID':     clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'text/plain',
      },
      timeout: 15000,
    }
  );
  return response.data || [];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET')     { return res.status(405).json({ error: 'Method not allowed' }); }

  try {
    const token    = await getToken();
    const clientId = getEnv('IGDB_CLIENT_ID');

    // IGDB hard limit = 500 per request. To get ~1000 we fire two requests in parallel.
    const [page1, page2] = await Promise.all([
      fetchPage(token, clientId, 0),
      fetchPage(token, clientId, 500),
    ]);

    const raw = [...page1, ...page2];

    // Deduplicate by id (shouldn't happen but be safe)
    const seen = new Set();
    const games = [];
    for (const game of raw) {
      if (seen.has(game.id)) continue;
      seen.add(game.id);
      games.push({
        id:      game.id,
        name:    game.name,
        genre:   game.genres?.[0]?.name || null,
        cover:   game.cover ? { url: game.cover.url } : null,
        steamId: game.external_games?.find(ex => ex.category === 1)?.uid || null,
      });
    }

    console.log(`✅ Trending: returned ${games.length} games`);
    return res.status(200).json(games);

  } catch (error) {
    console.error('[trending] error:', error.response?.data || error.message);
    return res.status(500).json({
      error:  'Failed to fetch trending games',
      detail: error.message,
    });
  }
}
