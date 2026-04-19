import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { GAMES } from '../../data/games';
import { compareGpu } from '../../data/gpuScoring';
import { getGameDetails, getGameRequirements } from '../../api/igdb';
import { OFFICIAL_REQUIREMENTS } from '../../data/official_requirements';
import styles from './GameDetail.module.css';

function resolveRequirements(steamSpecs, expertSpecs, mockGame, releaseYear) {
  const y = releaseYear;
  const fallback = (ifNew, ifMid, ifOld) =>
    y >= 2022 ? ifNew : y >= 2016 ? ifMid : ifOld;

  return {
    minCpuStr:  steamSpecs?.minimum?.cpu,
    recCpuStr:  steamSpecs?.recommended?.cpu,
    minGpuStr:  steamSpecs?.minimum?.gpu,
    recGpuStr:  steamSpecs?.recommended?.gpu,
    minCores:   steamSpecs?.minimum?.cores  || expertSpecs?.minCores  || mockGame?.minCores  || fallback(6, 4, 2),
    minRam:     steamSpecs?.minimum?.ram    || expertSpecs?.minRam    || mockGame?.minRam    || fallback(16, 8, 4),
    minGpu:     steamSpecs?.minimum?.gpu    || expertSpecs?.minGpu    || mockGame?.minGpu    || fallback('RTX 2060', 'GTX 1050', 'GTX 660'),
    recGpu:     steamSpecs?.recommended?.gpu || expertSpecs?.recGpu   || mockGame?.recGpu   || fallback('RTX 3070', 'RTX 2060', 'GTX 970'),
    recRam:     steamSpecs?.recommended?.ram || expertSpecs?.recRam   || (mockGame?.minRam ? mockGame.minRam * 2 : fallback(16, 16, 8)),
    minStorage: steamSpecs?.minimum?.storage || expertSpecs?.minStorage || mockGame?.minStorage || fallback(120, 70, 30),
    recStorage: steamSpecs?.recommended?.storage || expertSpecs?.minStorage || mockGame?.minStorage || fallback(120, 70, 30),
    minVram:    steamSpecs?.minimum?.vram    || null,
    recVram:    steamSpecs?.recommended?.vram || null,
  };
}

function driverUrl(gpuName) {
  if (!gpuName) return 'https://www.nvidia.com/Download/index.aspx';
  const g = gpuName.toLowerCase();
  if (g.includes('amd') || g.includes('radeon') || g.includes('rx '))
    return 'https://www.amd.com/en/support';
  if (g.includes('intel') || g.includes('arc') || g.includes('iris') || g.includes('uhd'))
    return 'https://www.intel.com/content/www/us/en/support/detect.html';
  return 'https://www.nvidia.com/Download/index.aspx';
}

function RatingCircle({ value, label, color }) {
  if (!value) return null;
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className={styles.ratingCircle}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
        <text x="40" y="45" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="800">{value}</text>
      </svg>
      <span className={styles.ratingLabel}>{label}</span>
    </div>
  );
}

export default function GameDetail({ specs }) {
  const { id } = useParams();
  const location = useLocation();

  const [details,    setDetails]    = useState(null);
  const [steamSpecs, setSteamSpecs] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('overview');
  const [activeShot, setActiveShot] = useState(0);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);

      // Prefer passed state (has igdb id), fallback to route id
      const igdbId = location.state?.igdbGame?.id || id;

      const [rich, reqs] = await Promise.all([
        getGameDetails(igdbId).catch(() => null),
        // We need steamId — try from passed state first
        getGameRequirements(
          location.state?.igdbGame?.steamId || null,
          location.state?.igdbGame?.name    || null
        ).catch(() => null),
      ]);

      setDetails(rich);

      // If we got steamId from rich data, fetch reqs now
      if (!reqs && rich?.steamId) {
        const r2 = await getGameRequirements(rich.steamId, rich.name).catch(() => null);
        setSteamSpecs(r2);
      } else {
        setSteamSpecs(reqs);
      }

      setLoading(false);
    }
    fetchAll();
  }, [id]);

  const gameNameLower = details?.name?.toLowerCase().trim();
  const expertSpecs   = gameNameLower ? OFFICIAL_REQUIREMENTS[gameNameLower] : null;
  const mockGame      = GAMES.find(g => g.id === parseInt(id)) ||
    GAMES.find(g => details?.name?.toLowerCase().includes(g.name.toLowerCase()));

  let game = null;
  if (details) {
    const releaseYear = details.releaseDate
      ? new Date(details.releaseDate).getFullYear()
      : 2010;
    const resolved = resolveRequirements(steamSpecs, expertSpecs, mockGame, releaseYear);
    game = { ...details, ...resolved };
  } else if (mockGame) {
    game = mockGame;
  }

  // ── Compatibility check helpers ──────────────────────────────────────────
  const checkStatus = (type, level) => {
    if (!specs) return null;
    if (type === 'os')      return specs.os ? true : null;
    if (type === 'storage') {
      if (typeof specs.storage !== 'number') return null;
      return specs.storage >= (level === 'min' ? (game?.minStorage || 70) : (game?.recStorage || 70));
    }
    if (type === 'vram') {
      if (typeof specs.vram !== 'number') return specs.gpu ? true : null;
      return specs.vram >= (level === 'min' ? (game?.minVram || 4) : (game?.recVram || 6));
    }
    if (type === 'shader') {
      if (!specs.shader) return specs.gpu ? true : null;
      return parseFloat(specs.shader) >= (level === 'min' ? 5.1 : 6.0);
    }
    if (type === 'cpu') {
      if (!specs.cores) return null;
      return parseInt(specs.cores) >= (level === 'min' ? game?.minCores : (game?.minCores + 2));
    }
    if (type === 'ram') {
      if (!specs.ram) return null;
      return parseFloat(specs.ram) >= (level === 'min' ? game?.minRam : game?.minRam * 2);
    }
    if (type === 'gpu') {
      if (!specs.gpu) return null;
      return compareGpu(specs.gpu, level === 'min' ? game?.minGpu : (game?.recGpu || 'RTX 3060'));
    }
    return null;
  };

  const renderRow = (label, requirement, type, level) => {
    const status = checkStatus(type, level);
    let icon = '?', iconClass = styles.iconUnknown;
    if (status === true)  { icon = '✓'; iconClass = styles.iconPass; }
    if (status === false) { icon = '✗'; iconClass = styles.iconFail; }

    let mySpec = 'Detecting…';
    if (specs) {
      if (type === 'cpu')     mySpec = specs.cpuName ? `${specs.cpuName} (${specs.cores}C)` : (specs.cores ? `${specs.cores} Cores` : 'Unknown');
      if (type === 'ram')     mySpec = specs.ram     ? `${specs.ram} GB` : 'Unknown';
      if (type === 'gpu')     mySpec = specs.gpu     || 'Unknown';
      if (type === 'vram')    mySpec = typeof specs.vram === 'number' ? `${specs.vram} GB` : (specs.gpu ? 'via GPU' : 'Unknown');
      if (type === 'shader')  mySpec = specs.shader  || (specs.gpu ? 'via GPU' : 'Unknown');
      if (type === 'os')      mySpec = specs.os      || 'Unknown';
      if (type === 'storage') mySpec = typeof specs.storage === 'number' ? `${specs.storage} GB Free` : 'Unknown';
    }

    return (
      <tr className={`${styles.reqRow} ${status === true ? styles.rowPass : status === false ? styles.rowFail : ''}`}>
        <td>{label}</td>
        <td>{requirement}</td>
        <td className={styles.mySpecCell}>{mySpec}</td>
        <td className={styles.iconCell}>
          <span className={`${styles.statusIcon} ${iconClass}`}>{icon}</span>
        </td>
      </tr>
    );
  };

  if (loading) return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingSpinner} />
      <p>Loading game details…</p>
    </div>
  );

  if (!game) return (
    <div className={styles.container}>
      <Link to="/games" className={styles.backLink}>← Back to Games</Link>
      <p style={{ color: 'var(--muted)', marginTop: '2rem' }}>Game not found.</p>
    </div>
  );

  const minPassList = ['cpu', 'ram', 'gpu'].map(t => checkStatus(t, 'min'));
  const recPassList = ['cpu', 'ram', 'gpu'].map(t => checkStatus(t, 'rec'));
  const overallMinPass = minPassList.includes(false) ? false : (minPassList.includes(null) ? null : true);
  const overallRecPass = recPassList.includes(false) ? false : (recPassList.includes(null) ? null : true);

  const heroVideo     = game.videos?.[0]?.videoId;
  const screenshots   = game.screenshots || [];
  const trailer       = game.videos?.find(v => v.name?.toLowerCase().includes('trailer')) || game.videos?.[0];

  return (
    <div className={styles.container}>
      {/* Blurred background */}
      {(screenshots[0]?.url || game.cover?.url) && (
        <div className={styles.pageBg} style={{ backgroundImage: `url(${screenshots[0]?.url || game.cover?.url})` }} />
      )}
      <div className={styles.contentOverlay} />

      <Link to="/games" className={styles.backLink}>← Back to Games</Link>

      {/* ── HERO SECTION ── */}
      <div className={styles.hero}>
        <div className={styles.heroCover}>
          {game.cover?.url
            ? <img src={game.cover.url} alt={game.name} />
            : <div className={styles.coverPlaceholder}>🎮</div>
          }
          {/* Rating badges */}
          <div className={styles.ratingBadges}>
            <RatingCircle value={game.rating}       label="User"   color="#00d4ff" />
            <RatingCircle value={game.criticRating}  label="Critic" color="#a855f7" />
          </div>
        </div>

        <div className={styles.heroInfo}>
          <div className={styles.genreTags}>
            {(game.genres || []).map(g => <span key={g} className={styles.tag}>{g}</span>)}
            {(game.themes || []).slice(0, 2).map(t => <span key={t} className={styles.tagTheme}>{t}</span>)}
          </div>

          <h1 className={styles.heroTitle}>{game.name}</h1>

          <div className={styles.metaRow}>
            {game.developer   && <span className={styles.metaItem}>🏢 {game.developer}</span>}
            {game.publisher   && game.publisher !== game.developer && <span className={styles.metaItem}>📦 {game.publisher}</span>}
            {game.releaseDate && <span className={styles.metaItem}>📅 {game.releaseDate}</span>}
            {game.gameModes?.length > 0 && <span className={styles.metaItem}>🎮 {game.gameModes.join(', ')}</span>}
          </div>

          {game.summary && (
            <p className={styles.heroSummary}>{game.summary}</p>
          )}

          {/* Compat pills */}
          <div className={styles.compatPills}>
            <div className={`${styles.compatPill} ${overallMinPass === true ? styles.pillPass : overallMinPass === false ? styles.pillFail : styles.pillUnknown}`}>
              {overallMinPass === true ? '✓' : overallMinPass === false ? '✗' : '?'} Minimum
            </div>
            <div className={`${styles.compatPill} ${overallRecPass === true ? styles.pillPass : overallRecPass === false ? styles.pillFail : styles.pillUnknown}`}>
              {overallRecPass === true ? '✓' : overallRecPass === false ? '✗' : '?'} Recommended
            </div>
            {steamSpecs && <div className={styles.pillOfficial}>✓ Official Steam Data</div>}
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className={styles.tabs}>
        {['overview', 'requirements', 'media'].map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview'     && '📋 Overview'}
            {tab === 'requirements' && '⚙️ Requirements'}
            {tab === 'media'        && '🎬 Media'}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className={styles.tabContent}>
          {/* Game info grid */}
          <div className={styles.infoGrid}>
            {game.platforms?.length > 0 && (
              <div className={styles.infoCard}>
                <h4>Platforms</h4>
                <p>{game.platforms.join(', ')}</p>
              </div>
            )}
            {game.gameModes?.length > 0 && (
              <div className={styles.infoCard}>
                <h4>Game Modes</h4>
                <p>{game.gameModes.join(', ')}</p>
              </div>
            )}
            {game.perspectives?.length > 0 && (
              <div className={styles.infoCard}>
                <h4>Perspective</h4>
                <p>{game.perspectives.join(', ')}</p>
              </div>
            )}
            {game.genres?.length > 0 && (
              <div className={styles.infoCard}>
                <h4>Genres</h4>
                <p>{game.genres.join(', ')}</p>
              </div>
            )}
            {game.developer && (
              <div className={styles.infoCard}>
                <h4>Developer</h4>
                <p>{game.developer}</p>
              </div>
            )}
            {game.publisher && (
              <div className={styles.infoCard}>
                <h4>Publisher</h4>
                <p>{game.publisher}</p>
              </div>
            )}
            {game.releaseDate && (
              <div className={styles.infoCard}>
                <h4>Release Date</h4>
                <p>{game.releaseDate}</p>
              </div>
            )}
            {game.ratingCount && (
              <div className={styles.infoCard}>
                <h4>User Ratings</h4>
                <p>{game.ratingCount.toLocaleString()} votes</p>
              </div>
            )}
          </div>

          {/* Similar games */}
          {game.similarGames?.length > 0 && (
            <div className={styles.similarSection}>
              <h3>Similar Games</h3>
              <div className={styles.similarGrid}>
                {game.similarGames.map(sg => (
                  <Link key={sg.id} to={`/games/${sg.id}`} className={styles.similarCard}>
                    {sg.cover?.url
                      ? <img src={sg.cover.url} alt={sg.name} />
                      : <div className={styles.similarPlaceholder}>🎮</div>
                    }
                    <span>{sg.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REQUIREMENTS TAB ── */}
      {activeTab === 'requirements' && (
        <div className={styles.tabContent}>
          {steamSpecs && <div className={styles.officialBadge}>✓ Official Steam Requirements</div>}
          <div className={styles.requirementsArea}>
            <div className={styles.reqBlock}>
              <h2>Minimum Requirements</h2>
              <table className={styles.reqTable}>
                <thead>
                  <tr><th></th><th>Requirement</th><th>My Specs</th><th></th></tr>
                </thead>
                <tbody>
                  {renderRow('CPU',        game.minCpuStr || `${game.minCores} Core CPU`,    'cpu',     'min')}
                  {renderRow('RAM',        `${game.minRam} GB`,                               'ram',     'min')}
                  {renderRow('GPU',        game.minGpuStr || game.minGpu,                     'gpu',     'min')}
                  {renderRow('VRAM',       '4 GB',                                            'vram',    'min')}
                  {renderRow('SHADER',     '5.1',                                             'shader',  'min')}
                  {renderRow('OS',         'Windows 10 64-bit',                               'os',      'min')}
                  {renderRow('STORAGE',    `${game.minStorage} GB`,                           'storage', 'min')}
                </tbody>
              </table>
            </div>

            <div className={styles.reqBlock}>
              <h2>Recommended Requirements</h2>
              <table className={styles.reqTable}>
                <thead>
                  <tr><th></th><th>Requirement</th><th>My Specs</th><th></th></tr>
                </thead>
                <tbody>
                  {renderRow('CPU',        game.recCpuStr || `${(game.minCores || 4) + 2} Core CPU`, 'cpu',     'rec')}
                  {renderRow('RAM',        `${game.recRam || (game.minRam * 2)} GB`,                  'ram',     'rec')}
                  {renderRow('GPU',        game.recGpuStr || game.recGpu || 'RTX 3060',               'gpu',     'rec')}
                  {renderRow('VRAM',       '6 GB',                                                    'vram',    'rec')}
                  {renderRow('SHADER',     '6.0',                                                     'shader',  'rec')}
                  {renderRow('OS',         'Windows 11 64-bit',                                       'os',      'rec')}
                  {renderRow('STORAGE',    `${game.recStorage} GB`,                                   'storage', 'rec')}
                </tbody>
              </table>
            </div>
          </div>

          <a href={driverUrl(specs?.gpu)} target="_blank" rel="noopener noreferrer" className={styles.driverBtn}>
            🔧 Get Latest Drivers for your GPU
          </a>
        </div>
      )}

      {/* ── MEDIA TAB ── */}
      {activeTab === 'media' && (
        <div className={styles.tabContent}>

          {/* Trailer */}
          {trailer && (
            <div className={styles.videoSection}>
              <h3>🎬 {trailer.name || 'Official Trailer'}</h3>
              <div className={styles.videoWrapper}>
                <iframe
                  src={`https://www.youtube.com/embed/${trailer.videoId}?autoplay=0&rel=0`}
                  title={trailer.name || 'Trailer'}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* All videos */}
          {game.videos?.length > 1 && (
            <div className={styles.videoGrid}>
              {game.videos.slice(1).map((v, i) => (
                <div key={i} className={styles.videoThumb}>
                  <iframe
                    src={`https://www.youtube.com/embed/${v.videoId}?rel=0`}
                    title={v.name || `Video ${i + 2}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  {v.name && <p>{v.name}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Screenshots gallery */}
          {screenshots.length > 0 && (
            <div className={styles.gallerySection}>
              <h3>📸 Screenshots</h3>
              <div className={styles.mainShot}>
                <img src={screenshots[activeShot]?.url} alt={`Screenshot ${activeShot + 1}`} />
              </div>
              <div className={styles.shotThumbs}>
                {screenshots.map((s, i) => (
                  <img
                    key={i}
                    src={s.url}
                    alt={`Thumb ${i + 1}`}
                    className={`${styles.thumb} ${i === activeShot ? styles.thumbActive : ''}`}
                    onClick={() => setActiveShot(i)}
                  />
                ))}
              </div>
            </div>
          )}

          {!trailer && screenshots.length === 0 && (
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '4rem' }}>No media available for this game.</p>
          )}
        </div>
      )}
    </div>
  );
}
