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
    null, { timeout: 8000 }
  );
  accessToken = res.data.access_token;
  tokenExpiry = Date.now() + res.data.expires_in * 1000 - 60000;
  return accessToken;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET')     { return res.status(405).json({ error: 'Method not allowed' }); }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id is required' });

  try {
    const token    = await getToken();
    const clientId = getEnv('IGDB_CLIENT_ID');

    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `fields
        name,
        summary,
        cover.url,
        screenshots.url,
        videos.video_id,
        videos.name,
        genres.name,
        themes.name,
        game_modes.name,
        player_perspectives.name,
        involved_companies.company.name,
        involved_companies.developer,
        involved_companies.publisher,
        first_release_date,
        rating,
        rating_count,
        aggregated_rating,
        external_games.uid,
        external_games.category,
        platforms.name,
        similar_games.name,
        similar_games.cover.url;
       where id = ${id};
       limit 1;`,
      {
        headers: {
          'Client-ID':     clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'text/plain',
        },
        timeout: 12000,
      }
    );

    if (!response.data || response.data.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = response.data[0];

    const developer  = game.involved_companies?.find(c => c.developer)?.company?.name  || null;
    const publisher  = game.involved_companies?.find(c => c.publisher)?.company?.name  || null;

    const toHighRes = (url, size) => {
      if (!url) return null;
      const secure = url.startsWith('https:') ? url : `https:${url}`;
      return secure.replace(/t_[a-z0-9_]+/, size);
    };

    const result = {
      id:           game.id,
      name:         game.name,
      summary:      game.summary || null,
      cover:        game.cover   ? { url: toHighRes(game.cover.url, 't_cover_big') } : null,
      screenshots:  (game.screenshots || []).map(s => ({ url: toHighRes(s.url, 't_screenshot_big') })),
      videos:       (game.videos || []).map(v => ({ videoId: v.video_id, name: v.name })),
      genres:       (game.genres || []).map(g => g.name),
      themes:       (game.themes || []).map(t => t.name),
      gameModes:    (game.game_modes || []).map(m => m.name),
      perspectives: (game.player_perspectives || []).map(p => p.name),
      developer,
      publisher,
      releaseDate:  game.first_release_date ? new Date(game.first_release_date * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null,
      rating:       game.rating ? Math.round(game.rating) : null,
      ratingCount:  game.rating_count || null,
      criticRating: game.aggregated_rating ? Math.round(game.aggregated_rating) : null,
      steamId:      game.external_games?.find(ex => ex.category === 1)?.uid || null,
      platforms:    (game.platforms || []).map(p => p.name),
      similarGames: (game.similar_games || []).slice(0, 4).map(g => ({
        id:    g.id,
        name:  g.name,
        cover: g.cover ? { url: toHighRes(g.cover.url, 't_cover_big') } : null,
      })),
    };

    return res.status(200).json(result);

  } catch (error) {
    console.error('[details] error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to fetch game details', detail: error.message });
  }
}
