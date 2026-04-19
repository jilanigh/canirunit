import axios from 'axios';

export default async function handler(req, res) {
  let { steamId, gameName } = req.query;

  try {
    if (!steamId && gameName) {
      const searchRes = await axios.get(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=english&cc=US`);
      if (searchRes.data?.items?.length > 0) {
        steamId = searchRes.data.items[0].id;
      }
    }

    if (!steamId) {
      return res.status(200).json({ playerCount: 0, downloads: 'N/A' });
    }

    // 1. Get Live Players
    const playerRes = await axios.get(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${steamId}`);
    const playerCount = playerRes.data?.response?.player_count || 0;

    // 2. Get "Downloads" (Estimated via Recommendations/Reviews x30)
    const detailRes = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${steamId}&filters=recommendations`);
    const recommendations = detailRes.data?.[steamId]?.data?.recommendations?.total || 1000;
    
    // Aesthetic estimation (Industry standard: Sales approx 30-50x more than reviews)
    const estimatedDownloads = recommendations * 42; 
    let formattedDownloads = '100K+';
    
    if (estimatedDownloads >= 1000000) {
      formattedDownloads = (estimatedDownloads / 1000000).toFixed(1) + 'M+';
    } else if (estimatedDownloads >= 1000) {
      formattedDownloads = (estimatedDownloads / 1000).toFixed(0) + 'K+';
    }

    res.setHeader('Cache-Control', 's-maxage=600'); // Cache for 10 mins
    res.status(200).json({ 
      playerCount, 
      downloads: formattedDownloads,
      steamId 
    });
  } catch (error) {
    res.status(200).json({ playerCount: 0, downloads: 'N/A' });
  }
}
