import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';

dotenv.config();

const app  = express();
const PORT = process.env.VITE_SERVER_PORT || 5000;

app.use(cors());
app.use(express.json());

// ── IGDB auth ──────────────────────────────────────────────────────────────
let accessToken = null;
let tokenExpiry  = null;

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
  tokenExpiry  = Date.now() + res.data.expires_in * 1000 - 60000;
  return accessToken;
}

// ── Fetch one page from IGDB (max 500) ────────────────────────────────────
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

// ── GET /api/games/trending ────────────────────────────────────────────────
app.get('/api/games/trending', async (req, res) => {
  try {
    const token    = await getToken();
    const clientId = getEnv('IGDB_CLIENT_ID');

    // Two pages in parallel → up to 1000 games
    const [page1, page2] = await Promise.all([
      fetchPage(token, clientId, 0),
      fetchPage(token, clientId, 500),
    ]);

    const raw  = [...page1, ...page2];
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
    return res.status(500).json({ error: 'Failed to fetch trending games', detail: error.message });
  }
});

// ── POST /api/games/search ─────────────────────────────────────────────────
app.post('/api/games/search', async (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query || !query.trim()) return res.status(400).json({ error: 'Query is required' });

    const token     = await getToken();
    const clientId  = getEnv('IGDB_CLIENT_ID');
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
});

// ── Agent sync — shared temp file (mirrors api/agent/sync.js) ─────────────
const TEMP_FILE = path.join(os.tmpdir(), 'cyri_agent_specs.json');

// Desktop agent POSTs specs here
app.post('/api/agent/sync', (req, res) => {
  try {
    const { cpuName, gpu, cores, ram, os: osName, storage, vram, shader } = req.body;
    const specs = { cpuName, gpu, cores, ram, os: osName, storage, vram, shader, detected: 'agent' };
    fs.writeFileSync(TEMP_FILE, JSON.stringify(specs));
    return res.status(200).json({ success: true, message: 'Specs synchronized!' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to write specs' });
  }
});

// Frontend polls here for agent specs
app.get('/api/agent/sync', (req, res) => {
  try {
    if (fs.existsSync(TEMP_FILE)) {
      const specs = JSON.parse(fs.readFileSync(TEMP_FILE, 'utf8'));
      return res.status(200).json(specs);
    }
    // No agent data yet — return 404 so the frontend keeps polling silently
    return res.status(404).json({ error: 'No agent specs found yet' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to read specs' });
  }
});

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`🎮 Backend server running on http://localhost:${PORT}`);
});
