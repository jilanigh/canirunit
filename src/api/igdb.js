const BASE = '/api';

// Convert any IGDB size token → desired size
function toHighRes(url, size = 't_cover_big') {
  if (!url) return null;
  const secure = url.startsWith('https:') ? url : `https:${url}`;
  return secure.replace(/t_[a-z0-9_]+/, size);
}

function normalizeGame(game) {
  return {
    ...game,
    genre:       game.genre || game.genres?.[0]?.name || null,
    cover:       game.cover
                   ? { ...game.cover, url: toHighRes(game.cover.url, 't_cover_big') }
                   : null,
    screenshots: (game.screenshots || []).map(s => ({
                   ...s, url: toHighRes(s.url, 't_screenshot_big'),
                 })),
    steamId: game.steamId || null,
  };
}

export async function getTrendingGames() {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(`${BASE}/games/trending`, { signal: controller.signal });
    clearTimeout(tid);

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const e = await res.json(); msg = e.error || msg; } catch {}
      throw new Error(msg);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Empty or invalid response from /api/games/trending');
    }

    return data.map(normalizeGame);
  } catch (err) {
    clearTimeout(tid);
    throw err;
  }
}

export async function searchGames(query) {
  const res = await fetch(`${BASE}/games/search`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ query }),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const e = await res.json(); msg = e.error || msg; } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  return data.map(normalizeGame);
}

export async function getGameDetails(igdbId) {
  try {
    const res = await fetch(`${BASE}/games/details?id=${igdbId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getGameRequirements(steamId, gameName) {
  const q = steamId
    ? `steamId=${steamId}`
    : `gameName=${encodeURIComponent(gameName)}`;
  try {
    const res = await fetch(`${BASE}/games/requirements?${q}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
