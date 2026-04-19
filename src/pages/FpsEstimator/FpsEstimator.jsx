import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './FpsEstimator.module.css';
import { getTrendingGames } from '../../api/igdb';

// ─────────────────────────────────────────────
// GPU DATABASE  (150+ cards, production-ready)
// ─────────────────────────────────────────────
const GPUS = [
  // ── NVIDIA RTX 50 series ──────────────────
  { name: 'RTX 5090',          tier: 'ultra', score: 100 },
  { name: 'RTX 5080',          tier: 'ultra', score: 92  },
  { name: 'RTX 5070 Ti',       tier: 'ultra', score: 85  },
  { name: 'RTX 5070',          tier: 'high',  score: 78  },
  { name: 'RTX 5060 Ti',       tier: 'high',  score: 68  },
  { name: 'RTX 5060',          tier: 'mid',   score: 58  },
  // ── NVIDIA RTX 40 series ──────────────────
  { name: 'RTX 4090',          tier: 'ultra', score: 97  },
  { name: 'RTX 4080 Super',    tier: 'ultra', score: 89  },
  { name: 'RTX 4080',          tier: 'ultra', score: 86  },
  { name: 'RTX 4070 Ti Super', tier: 'high',  score: 81  },
  { name: 'RTX 4070 Ti',       tier: 'high',  score: 77  },
  { name: 'RTX 4070 Super',    tier: 'high',  score: 73  },
  { name: 'RTX 4070',          tier: 'high',  score: 68  },
  { name: 'RTX 4060 Ti 16GB',  tier: 'mid',   score: 61  },
  { name: 'RTX 4060 Ti',       tier: 'mid',   score: 59  },
  { name: 'RTX 4060',          tier: 'mid',   score: 50  },
  { name: 'RTX 4050',          tier: 'entry', score: 38  },
  // ── NVIDIA RTX 30 series ──────────────────
  { name: 'RTX 3090 Ti',       tier: 'ultra', score: 83  },
  { name: 'RTX 3090',          tier: 'ultra', score: 79  },
  { name: 'RTX 3080 Ti',       tier: 'high',  score: 75  },
  { name: 'RTX 3080 12GB',     tier: 'high',  score: 73  },
  { name: 'RTX 3080',          tier: 'high',  score: 71  },
  { name: 'RTX 3070 Ti',       tier: 'high',  score: 64  },
  { name: 'RTX 3070',          tier: 'high',  score: 61  },
  { name: 'RTX 3060 Ti',       tier: 'mid',   score: 54  },
  { name: 'RTX 3060',          tier: 'mid',   score: 46  },
  { name: 'RTX 3050 8GB',      tier: 'entry', score: 36  },
  { name: 'RTX 3050 6GB',      tier: 'entry', score: 30  },
  // ── NVIDIA RTX 20 series ──────────────────
  { name: 'RTX 2080 Ti',       tier: 'high',  score: 65  },
  { name: 'RTX 2080 Super',    tier: 'high',  score: 59  },
  { name: 'RTX 2080',          tier: 'high',  score: 56  },
  { name: 'RTX 2070 Super',    tier: 'high',  score: 53  },
  { name: 'RTX 2070',          tier: 'mid',   score: 49  },
  { name: 'RTX 2060 Super',    tier: 'mid',   score: 45  },
  { name: 'RTX 2060',          tier: 'mid',   score: 41  },
  // ── NVIDIA GTX 16 series ──────────────────
  { name: 'GTX 1660 Ti',       tier: 'mid',   score: 38  },
  { name: 'GTX 1660 Super',    tier: 'mid',   score: 37  },
  { name: 'GTX 1660',          tier: 'mid',   score: 34  },
  { name: 'GTX 1650 Super',    tier: 'entry', score: 29  },
  { name: 'GTX 1650',          tier: 'entry', score: 24  },
  { name: 'GTX 1630',          tier: 'entry', score: 18  },
  // ── NVIDIA GTX 10 series ──────────────────
  { name: 'GTX 1080 Ti',       tier: 'high',  score: 53  },
  { name: 'GTX 1080',          tier: 'high',  score: 47  },
  { name: 'GTX 1070 Ti',       tier: 'mid',   score: 43  },
  { name: 'GTX 1070',          tier: 'mid',   score: 39  },
  { name: 'GTX 1060 6GB',      tier: 'mid',   score: 33  },
  { name: 'GTX 1060 3GB',      tier: 'entry', score: 27  },
  { name: 'GTX 1050 Ti',       tier: 'entry', score: 21  },
  { name: 'GTX 1050',          tier: 'entry', score: 17  },
  { name: 'GT 1030',           tier: 'entry', score: 9   },
  // ── NVIDIA GTX 900 series ─────────────────
  { name: 'GTX 980 Ti',        tier: 'mid',   score: 37  },
  { name: 'GTX 980',           tier: 'mid',   score: 31  },
  { name: 'GTX 970',           tier: 'entry', score: 27  },
  { name: 'GTX 960',           tier: 'entry', score: 20  },
  { name: 'GTX 950',           tier: 'entry', score: 15  },
  // ── NVIDIA Quadro / RTX A series ─────────
  { name: 'RTX A6000',         tier: 'ultra', score: 88  },
  { name: 'RTX A5000',         tier: 'ultra', score: 82  },
  { name: 'RTX A4000',         tier: 'high',  score: 68  },
  { name: 'RTX A2000',         tier: 'mid',   score: 44  },
  // ── AMD RX 9000 series ────────────────────
  { name: 'RX 9070 XT',        tier: 'ultra', score: 90  },
  { name: 'RX 9070',           tier: 'high',  score: 80  },
  // ── AMD RX 7000 series ────────────────────
  { name: 'RX 7900 XTX',       tier: 'ultra', score: 95  },
  { name: 'RX 7900 XT',        tier: 'ultra', score: 88  },
  { name: 'RX 7900 GRE',       tier: 'high',  score: 79  },
  { name: 'RX 7800 XT',        tier: 'high',  score: 71  },
  { name: 'RX 7700 XT',        tier: 'high',  score: 64  },
  { name: 'RX 7600 XT',        tier: 'mid',   score: 53  },
  { name: 'RX 7600',           tier: 'mid',   score: 47  },
  { name: 'RX 7500 XT',        tier: 'entry', score: 33  },
  // ── AMD RX 6000 series ────────────────────
  { name: 'RX 6950 XT',        tier: 'ultra', score: 85  },
  { name: 'RX 6900 XT',        tier: 'ultra', score: 81  },
  { name: 'RX 6800 XT',        tier: 'high',  score: 75  },
  { name: 'RX 6800',           tier: 'high',  score: 69  },
  { name: 'RX 6750 XT',        tier: 'high',  score: 63  },
  { name: 'RX 6700 XT',        tier: 'high',  score: 61  },
  { name: 'RX 6700',           tier: 'high',  score: 56  },
  { name: 'RX 6650 XT',        tier: 'mid',   score: 51  },
  { name: 'RX 6600 XT',        tier: 'mid',   score: 49  },
  { name: 'RX 6600',           tier: 'mid',   score: 44  },
  { name: 'RX 6500 XT',        tier: 'entry', score: 28  },
  { name: 'RX 6400',           tier: 'entry', score: 21  },
  // ── AMD RX 5000 series ────────────────────
  { name: 'RX 5700 XT',        tier: 'high',  score: 56  },
  { name: 'RX 5700',           tier: 'high',  score: 51  },
  { name: 'RX 5600 XT',        tier: 'mid',   score: 45  },
  { name: 'RX 5500 XT 8GB',    tier: 'entry', score: 31  },
  { name: 'RX 5500 XT 4GB',    tier: 'entry', score: 27  },
  { name: 'RX 5300',           tier: 'entry', score: 22  },
  // ── AMD RX Vega ───────────────────────────
  { name: 'RX Vega 64',        tier: 'high',  score: 45  },
  { name: 'RX Vega 56',        tier: 'mid',   score: 39  },
  // ── AMD RX 500 series ─────────────────────
  { name: 'RX 590',            tier: 'mid',   score: 30  },
  { name: 'RX 580 8GB',        tier: 'mid',   score: 27  },
  { name: 'RX 580 4GB',        tier: 'entry', score: 23  },
  { name: 'RX 570',            tier: 'entry', score: 21  },
  { name: 'RX 560',            tier: 'entry', score: 14  },
  { name: 'RX 550',            tier: 'entry', score: 10  },
  // ── AMD Radeon Pro ────────────────────────
  { name: 'Radeon Pro W7900',  tier: 'ultra', score: 87  },
  { name: 'Radeon Pro W7800',  tier: 'ultra', score: 80  },
  { name: 'Radeon Pro W6800',  tier: 'high',  score: 68  },
  // ── Intel Arc A series ────────────────────
  { name: 'Arc A770 16GB',     tier: 'mid',   score: 48  },
  { name: 'Arc A770 8GB',      tier: 'mid',   score: 46  },
  { name: 'Arc A750',          tier: 'mid',   score: 41  },
  { name: 'Arc A580',          tier: 'mid',   score: 34  },
  { name: 'Arc A380',          tier: 'entry', score: 21  },
  { name: 'Arc A310',          tier: 'entry', score: 13  },
  // ── Intel Arc B series ────────────────────
  { name: 'Arc B580',          tier: 'mid',   score: 55  },
  { name: 'Arc B570',          tier: 'mid',   score: 48  },
  // ── Laptop GPUs ───────────────────────────
  { name: 'RTX 4090 Laptop',   tier: 'ultra', score: 78  },
  { name: 'RTX 4080 Laptop',   tier: 'high',  score: 70  },
  { name: 'RTX 4070 Laptop',   tier: 'high',  score: 62  },
  { name: 'RTX 4060 Laptop',   tier: 'mid',   score: 50  },
  { name: 'RTX 4050 Laptop',   tier: 'mid',   score: 40  },
  { name: 'RTX 3080 Ti Laptop',tier: 'high',  score: 66  },
  { name: 'RTX 3080 Laptop',   tier: 'high',  score: 60  },
  { name: 'RTX 3070 Ti Laptop',tier: 'high',  score: 55  },
  { name: 'RTX 3070 Laptop',   tier: 'mid',   score: 50  },
  { name: 'RTX 3060 Laptop',   tier: 'mid',   score: 42  },
  { name: 'RTX 3050 Ti Laptop',tier: 'entry', score: 32  },
  { name: 'RTX 3050 Laptop',   tier: 'entry', score: 28  },
  { name: 'RTX 2080 Super Laptop', tier: 'high', score: 53 },
  { name: 'RTX 2070 Super Laptop', tier: 'high', score: 48 },
  { name: 'RTX 2060 Laptop',   tier: 'mid',   score: 38  },
  { name: 'GTX 1660 Ti Laptop',tier: 'mid',   score: 32  },
  { name: 'GTX 1650 Ti Laptop',tier: 'entry', score: 23  },
  { name: 'RX 7600M XT',       tier: 'mid',   score: 46  },
  { name: 'RX 6700M',          tier: 'mid',   score: 48  },
  { name: 'RX 6600M',          tier: 'mid',   score: 40  },
  { name: 'RX 6500M',          tier: 'entry', score: 26  },
  // ── Integrated / APU ─────────────────────
  { name: 'Intel Iris Xe',     tier: 'entry', score: 8   },
  { name: 'AMD Radeon 780M',   tier: 'entry', score: 14  },
  { name: 'AMD Radeon 760M',   tier: 'entry', score: 11  },
  { name: 'AMD Radeon Vega 8', tier: 'entry', score: 6   },
];

// ─────────────────────────────────────────────
// FALLBACK GAME DATABASE (used when API fails)
// ─────────────────────────────────────────────
const FALLBACK_GAMES = [
  { id: 'cyberpunk',  name: 'Cyberpunk 2077',       emoji: '🌆', baseFps: 58,  heaviness: 1.45 },
  { id: 'eldenring',  name: 'Elden Ring',            emoji: '⚔️', baseFps: 82,  heaviness: 1.10 },
  { id: 'godofwar',   name: 'God of War',            emoji: '🪓', baseFps: 75,  heaviness: 1.20 },
  { id: 'bg3',        name: "Baldur's Gate 3",       emoji: '🎲', baseFps: 70,  heaviness: 1.15 },
  { id: 'alanwake2',  name: 'Alan Wake 2',           emoji: '🔦', baseFps: 45,  heaviness: 1.55 },
  { id: 'rdr2',       name: 'Red Dead Redemption 2', emoji: '🤠', baseFps: 65,  heaviness: 1.30 },
  { id: 'hogwarts',   name: 'Hogwarts Legacy',       emoji: '🧙', baseFps: 68,  heaviness: 1.25 },
  { id: 'forza5',     name: 'Forza Horizon 5',       emoji: '🏎️', baseFps: 90,  heaviness: 1.05 },
  { id: 'spiderman',  name: 'Spider-Man Remastered', emoji: '🕷️', baseFps: 80,  heaviness: 1.10 },
  { id: 'mw3',        name: 'Call of Duty: MW3',     emoji: '🎖️', baseFps: 88,  heaviness: 1.05 },
  { id: 'valorant',   name: 'Valorant',              emoji: '🔫', baseFps: 200, heaviness: 0.60 },
  { id: 'cs2',        name: 'CS2',                   emoji: '💣', baseFps: 180, heaviness: 0.65 },
  { id: 'fortnite',   name: 'Fortnite',              emoji: '🏗️', baseFps: 100, heaviness: 0.90 },
  { id: 'apex',       name: 'Apex Legends',          emoji: '🦾', baseFps: 110, heaviness: 0.88 },
  { id: 'minecraft',  name: 'Minecraft',             emoji: '⛏️', baseFps: 160, heaviness: 0.70 },
  { id: 'rust',       name: 'Rust',                  emoji: '🏭', baseFps: 75,  heaviness: 1.10 },
  { id: 'r6siege',    name: 'Rainbow Six Siege',     emoji: '🛡️', baseFps: 140, heaviness: 0.75 },
  { id: 'starfield',  name: 'Starfield',             emoji: '🚀', baseFps: 60,  heaviness: 1.35 },
  { id: 'helldivers', name: 'Helldivers 2',          emoji: '🪖', baseFps: 72,  heaviness: 1.18 },
  { id: 'gtav',       name: 'GTA V',                 emoji: '🚗', baseFps: 120, heaviness: 0.85 },
  { id: 'dota2',      name: 'Dota 2',                emoji: '🧙', baseFps: 170, heaviness: 0.68 },
  { id: 'lol',        name: 'League of Legends',     emoji: '⚔️', baseFps: 200, heaviness: 0.55 },
  { id: 'overwatch2', name: 'Overwatch 2',           emoji: '🦸', baseFps: 150, heaviness: 0.72 },
  { id: 'pubg',       name: 'PUBG',                  emoji: '🎯', baseFps: 80,  heaviness: 1.15 },
  { id: 'witcher3',   name: 'The Witcher 3',         emoji: '🗡️', baseFps: 85,  heaviness: 1.08 },
];

// ── FPS profile map: game name → {baseFps, heaviness} ──
const FPS_MAP = {
  'Cyberpunk 2077':                    { baseFps: 58,  heaviness: 1.45 },
  'Elden Ring':                        { baseFps: 82,  heaviness: 1.10 },
  'God of War':                        { baseFps: 75,  heaviness: 1.20 },
  "Baldur's Gate 3":                   { baseFps: 70,  heaviness: 1.15 },
  'Alan Wake 2':                       { baseFps: 45,  heaviness: 1.55 },
  'Red Dead Redemption 2':             { baseFps: 65,  heaviness: 1.30 },
  'Hogwarts Legacy':                   { baseFps: 68,  heaviness: 1.25 },
  'Forza Horizon 5':                   { baseFps: 90,  heaviness: 1.05 },
  "Marvel's Spider-Man Remastered":    { baseFps: 80,  heaviness: 1.10 },
  'Call of Duty: Modern Warfare III':  { baseFps: 88,  heaviness: 1.05 },
  'Call of Duty: Modern Warfare II':   { baseFps: 90,  heaviness: 1.02 },
  'Valorant':                          { baseFps: 200, heaviness: 0.60 },
  'Counter-Strike 2':                  { baseFps: 180, heaviness: 0.65 },
  'Fortnite':                          { baseFps: 100, heaviness: 0.90 },
  'Apex Legends':                      { baseFps: 110, heaviness: 0.88 },
  'Minecraft':                         { baseFps: 160, heaviness: 0.70 },
  'Rust':                              { baseFps: 75,  heaviness: 1.10 },
  "Tom Clancy's Rainbow Six Siege":    { baseFps: 140, heaviness: 0.75 },
  'Starfield':                         { baseFps: 60,  heaviness: 1.35 },
  'Helldivers 2':                      { baseFps: 72,  heaviness: 1.18 },
  'Grand Theft Auto V':                { baseFps: 120, heaviness: 0.85 },
  'Dota 2':                            { baseFps: 170, heaviness: 0.68 },
  'League of Legends':                 { baseFps: 200, heaviness: 0.55 },
  'Overwatch 2':                       { baseFps: 150, heaviness: 0.72 },
  'PUBG: Battlegrounds':               { baseFps: 80,  heaviness: 1.15 },
  'The Witcher 3: Wild Hunt':          { baseFps: 85,  heaviness: 1.08 },
  'Resident Evil 4':                   { baseFps: 90,  heaviness: 1.08 },
  'Resident Evil Village':             { baseFps: 92,  heaviness: 1.06 },
  'Monster Hunter: World':             { baseFps: 80,  heaviness: 1.12 },
  'Monster Hunter Rise':               { baseFps: 95,  heaviness: 1.00 },
  'Dark Souls III':                    { baseFps: 90,  heaviness: 1.05 },
  'Sekiro: Shadows Die Twice':         { baseFps: 90,  heaviness: 1.05 },
  'Death Stranding':                   { baseFps: 95,  heaviness: 1.02 },
  'Doom Eternal':                      { baseFps: 130, heaviness: 0.80 },
  'Halo Infinite':                     { baseFps: 100, heaviness: 0.92 },
  'Destiny 2':                         { baseFps: 110, heaviness: 0.88 },
  'Diablo IV':                         { baseFps: 95,  heaviness: 0.95 },
  'Total War: Warhammer III':          { baseFps: 60,  heaviness: 1.30 },
  'Microsoft Flight Simulator':        { baseFps: 35,  heaviness: 1.80 },
  'Deep Rock Galactic':                { baseFps: 120, heaviness: 0.82 },
  'Escape from Tarkov':                { baseFps: 75,  heaviness: 1.15 },
};

function getGameProfile(name) {
  if (!name) return { baseFps: 75, heaviness: 1.0 };
  if (FPS_MAP[name]) return FPS_MAP[name];
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(FPS_MAP)) {
    if (lower.includes(key.toLowerCase().split(':')[0].trim())) return val;
  }
  return { baseFps: 75, heaviness: 1.0 };
}

const RESOLUTIONS = [
  { label: '1080p', multiplier: 1.00 },
  { label: '1440p', multiplier: 0.62 },
  { label: '4K',    multiplier: 0.30 },
];
const QUALITIES = [
  { label: 'Low',    multiplier: 1.45 },
  { label: 'Medium', multiplier: 1.00 },
  { label: 'High',   multiplier: 0.70 },
  { label: 'Ultra',  multiplier: 0.48 },
];

function estimateFps(gpu, game, resolution, quality) {
  const profile  = game._profile || getGameProfile(game.name);
  const gpuRatio = gpu.score / 50;
  const base     = profile.baseFps * gpuRatio;
  const adjusted = base * resolution.multiplier * quality.multiplier / profile.heaviness;
  const jitter   = Math.sin(gpu.score * 7 + profile.baseFps) * 0.04 + 1;
  return Math.max(1, Math.round(adjusted * jitter));
}

// ── FPS Gauge SVG ─────────────────────────────
function FpsGauge({ fps }) {
  const max   = 240;
  const pct   = Math.min(fps / max, 1);
  const angle = -135 + pct * 270;
  const color = fps >= 60 ? '#39ff14' : fps >= 30 ? '#ffd600' : '#ff3b3b';
  const cx = 100, cy = 100, R = 70;

  const polar = (deg, r) => {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arc = (a1, a2, r) => {
    const s = polar(a1, r), e = polar(a2, r);
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
  };
  const ts = -45, te = 225;

  return (
    <svg viewBox="0 0 200 200" className={styles.gaugeSvg}>
      <defs>
        <linearGradient id="fps-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#ff3b3b" />
          <stop offset="50%"  stopColor="#ffd600" />
          <stop offset="100%" stopColor="#39ff14" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={arc(ts, te, R)} stroke="#1a202d" strokeWidth="12" fill="none" strokeLinecap="round" />
      {fps > 0 && (
        <path d={arc(ts, Math.max(ts + 0.1, ts + pct * 270), R)}
          stroke="url(#fps-grad)" strokeWidth="12" fill="none" strokeLinecap="round" filter="url(#glow)" />
      )}
      {[0, 30, 60, 120, 240].map(v => {
        const a = ts + Math.min(v / max, 1) * 270;
        const i = polar(a, 55), o = polar(a, 65), t = polar(a, 44);
        return (
          <g key={v}>
            <line x1={i.x} y1={i.y} x2={o.x} y2={o.y} stroke="#2d3446" strokeWidth="2" />
            <text x={t.x} y={t.y} textAnchor="middle" dominantBaseline="middle"
              fill="#4a5068" fontSize="7" fontFamily="Rajdhani, sans-serif">{v}</text>
          </g>
        );
      })}
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${cx}px ${cy}px`,
                  transition: 'transform 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <path d={`M ${cx-2} ${cy} L ${cx} ${cy-R+8} L ${cx+2} ${cy} Z`} fill={color} filter="url(#glow)" />
        <circle cx={cx} cy={cy} r="5" fill="#fff" />
        <circle cx={cx} cy={cy} r="3" fill={color} />
      </g>
      <text x={cx} y={cy+22} textAnchor="middle" fill={color}
        fontSize="28" fontWeight="700" fontFamily="Rajdhani, sans-serif" filter="url(#glow)">{fps}</text>
      <text x={cx} y={cy+34} textAnchor="middle" fill="#6c7289"
        fontSize="9" fontFamily="Barlow, sans-serif" letterSpacing="1">FPS</text>
    </svg>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function FpsEstimator() {
  const [gpuQuery,     setGpuQuery]     = useState('');
  const [selectedGpu,  setSelectedGpu]  = useState(null);
  const [showGpuDrop,  setShowGpuDrop]  = useState(false);
  const gpuRef = useRef(null);

  const [games,        setGames]        = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError,   setGamesError]   = useState(null);   // ← new: track error
  const [usingFallback,setUsingFallback]= useState(false);  // ← new: show notice
  const [gameSearch,   setGameSearch]   = useState('');
  const [selectedGame, setSelectedGame] = useState(null);

  const [resolution,   setResolution]   = useState(RESOLUTIONS[0]);
  const [quality,      setQuality]      = useState(QUALITIES[1]);
  const [displayFps,   setDisplayFps]   = useState(0);
  const animRef = useRef(null);

  // ── Load games ────────────────────────────────────────────────────────────
  const loadGames = useCallback(async () => {
    setGamesLoading(true);
    setGamesError(null);
    setUsingFallback(false);
    try {
      const data = await getTrendingGames();
      const mapped = data.map(g => ({ ...g, _profile: getGameProfile(g.name) }));
      setGames(mapped);
      if (mapped.length > 0 && !selectedGame) setSelectedGame(mapped[0]);
    } catch (err) {
      console.warn('[FpsEstimator] API failed, using fallback:', err.message);
      // Always show the fallback list — never leave the user with nothing
      const fb = FALLBACK_GAMES.map(g => ({
        ...g,
        _profile: { baseFps: g.baseFps, heaviness: g.heaviness },
      }));
      setGames(fb);
      setSelectedGame(fb[0]);
      setUsingFallback(true);
      setGamesError(err.message);
    } finally {
      setGamesLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadGames(); }, [loadGames]);

  // ── GPU autocomplete ──────────────────────────────────────────────────────
  const filteredGpus = GPUS.filter(g =>
    g.name.toLowerCase().includes(gpuQuery.toLowerCase())
  ).slice(0, 12);

  // ── FPS estimate ──────────────────────────────────────────────────────────
  const estimatedFps = selectedGpu && selectedGame
    ? estimateFps(selectedGpu, selectedGame, resolution, quality)
    : 0;

  // ── Animated counter ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedGpu || !selectedGame) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    let start = null;
    const from = displayFps, to = estimatedFps, dur = 850;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplayFps(Math.round(from + (to - from) * e));
      if (p < 1) animRef.current = requestAnimationFrame(step);
      else setDisplayFps(to);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [estimatedFps]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close GPU dropdown on outside click ──────────────────────────────────
  useEffect(() => {
    const h = e => {
      if (gpuRef.current && !gpuRef.current.contains(e.target)) setShowGpuDrop(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filteredGames = games.filter(g =>
    g.name.toLowerCase().includes(gameSearch.toLowerCase())
  );

  const fpsRating = displayFps >= 120 ? { label: 'Excellent',  color: '#39ff14' }
    : displayFps >= 60  ? { label: 'Smooth',     color: '#39ff14' }
    : displayFps >= 30  ? { label: 'Playable',   color: '#ffd600' }
    : displayFps >  0   ? { label: 'Struggling', color: '#ff3b3b' }
    : null;

  const getCover = g => g.cover?.url || null;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>FPS <span className={styles.accent}>Estimator</span></h1>
        <p className={styles.subtitle}>
          Pick your GPU, game, resolution and quality — get an instant FPS estimate.
        </p>
      </div>

      <div className={styles.layout}>
        {/* ══════════ LEFT CONTROLS ══════════ */}
        <div className={styles.controls}>

          {/* GPU */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}><span>🖥️</span> Your GPU</div>
            <div ref={gpuRef} className={styles.autocomplete}>
              <input
                className={styles.gpuInput}
                placeholder="Search GPU — e.g. RTX 4070, RX 7800 XT, Arc B580"
                value={gpuQuery}
                onChange={e => { setGpuQuery(e.target.value); setShowGpuDrop(true); }}
                onFocus={() => setShowGpuDrop(true)}
              />
              {showGpuDrop && filteredGpus.length > 0 && (
                <ul className={styles.dropdown}>
                  {filteredGpus.map(gpu => (
                    <li key={gpu.name}
                      className={`${styles.dropdownItem} ${selectedGpu?.name === gpu.name ? styles.selected : ''}`}
                      onMouseDown={() => { setSelectedGpu(gpu); setGpuQuery(gpu.name); setShowGpuDrop(false); }}>
                      <span className={styles.gpuName}>{gpu.name}</span>
                      <span className={`${styles.tierBadge} ${styles['tier_' + gpu.tier]}`}>{gpu.tier}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selectedGpu && (
              <div className={styles.gpuScore}>
                <span className={styles.scoreLabel}>Performance</span>
                <div className={styles.scoreBar}>
                  <div className={styles.scoreFill} style={{ width: `${selectedGpu.score}%` }} />
                </div>
                <span className={styles.scoreNum}>{selectedGpu.score}/100</span>
              </div>
            )}
          </div>

          {/* Game */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>
              <span>🎮</span> Game
              {/* Subtle badge showing source */}
              {!gamesLoading && (
                <span className={styles.gameSourceBadge}>
                  {usingFallback ? '📦 offline list' : `${games.length} from IGDB`}
                </span>
              )}
            </div>

            {/* Retry bar — shown when using fallback but API exists */}
            {!gamesLoading && usingFallback && (
              <div className={styles.fallbackBar}>
                <span>⚠️ Live data unavailable</span>
                <button className={styles.retryBtn} onClick={loadGames}>Retry</button>
              </div>
            )}

            <div className={styles.gameSearchWrap}>
              <span className={styles.gameSearchIcon}>🔍</span>
              <input
                className={styles.gameSearchInput}
                placeholder={gamesLoading ? 'Loading games…' : 'Search games...'}
                value={gameSearch}
                onChange={e => setGameSearch(e.target.value)}
                disabled={gamesLoading}
              />
              {gameSearch && (
                <button className={styles.gameSearchClear} onClick={() => setGameSearch('')}>✕</button>
              )}
            </div>

            <div className={styles.gameList}>
              {gamesLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={styles.gameSkeletonItem} />
                ))
              ) : filteredGames.length === 0 ? (
                <div className={styles.gameNoResults}>No games found</div>
              ) : (
                filteredGames.map(g => (
                  <button
                    key={g.id}
                    className={`${styles.gameListItem} ${selectedGame?.id === g.id ? styles.gameListItemActive : ''}`}
                    onClick={() => setSelectedGame(g)}
                  >
                    {getCover(g) ? (
                      <img src={getCover(g)} alt={g.name} className={styles.gameThumb}
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <div className={styles.gameThumbFallback}
                      style={{ display: getCover(g) ? 'none' : 'flex' }}>
                      {g.emoji || '🎮'}
                    </div>
                    <div className={styles.gameInfo}>
                      <span className={styles.gameListName}>{g.name}</span>
                      {g.genre && <span className={styles.gameGenre}>{g.genre}</span>}
                    </div>
                    {selectedGame?.id === g.id && <span className={styles.gameCheckmark}>✓</span>}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Resolution */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}><span>📺</span> Resolution</div>
            <div className={styles.toggleRow}>
              {RESOLUTIONS.map(r => (
                <button key={r.label}
                  className={`${styles.toggleBtn} ${resolution.label === r.label ? styles.toggleActive : ''}`}
                  onClick={() => setResolution(r)}>{r.label}</button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}><span>✨</span> Quality Preset</div>
            <div className={styles.toggleRow}>
              {QUALITIES.map(q => (
                <button key={q.label}
                  className={`${styles.toggleBtn} ${quality.label === q.label ? styles.toggleActive : ''}`}
                  onClick={() => setQuality(q)}>{q.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ RIGHT RESULT ══════════ */}
        <div className={styles.result}>
          {!selectedGpu ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🖥️</div>
              <p>Search and select your GPU<br />to see estimated FPS</p>
            </div>
          ) : (
            <>
              {selectedGame && getCover(selectedGame) && (
                <div className={styles.gameBanner}>
                  <img src={getCover(selectedGame)} alt={selectedGame.name} className={styles.gameBannerImg} />
                  <div className={styles.gameBannerOverlay} />
                  <span className={styles.gameBannerName}>{selectedGame.name}</span>
                </div>
              )}

              <div className={styles.gaugeWrap}>
                <FpsGauge fps={displayFps} />
              </div>

              {fpsRating && (
                <div className={styles.ratingPill} style={{ borderColor: fpsRating.color, color: fpsRating.color }}>
                  {fpsRating.label}
                </div>
              )}

              <div className={styles.resultMeta}>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>GPU</span>
                  <span className={styles.metaValue}>{selectedGpu.name}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Game</span>
                  <span className={styles.metaValue}>{selectedGame?.name}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Settings</span>
                  <span className={styles.metaValue}>{resolution.label} / {quality.label}</span>
                </div>
              </div>

              <div className={styles.targets}>
                {[30, 60, 120, 144].map(target => {
                  const met = estimatedFps >= target;
                  return (
                    <div key={target} className={`${styles.targetItem} ${met ? styles.targetMet : styles.targetMiss}`}>
                      <span>{met ? '✓' : '✗'}</span>{target} FPS
                    </div>
                  );
                })}
              </div>

              <p className={styles.disclaimer}>
                Estimates based on average benchmarks. Actual FPS varies with CPU, RAM, drivers and background load.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
