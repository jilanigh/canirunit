import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import styles from './GameCard.module.css';
import { getCompatibility } from '../../hooks/useSpecs';

// ── CHANGE VELOCITY HERE ───────────────────────────────────────────────────
const MOTION_SETTINGS = {
  revealDuration: 0.5,    // Time to "pop" into view (lower is faster)
  hoverLiftSpeed: 0.2,    // Speed of the lift effect (lower is snappier)
  hoverLiftAmount: -10,   // How many pixels the card lifts up
};
// ─────────────────────────────────────────────────────────────────────────────

export default function GameCard({ game, specs }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState({ players: 0, downloads: null });
  const compat = getCompatibility(game, specs);

  const COMPAT_CONFIG = {
    recommended: { label: t('recommended'), cls: 'compatYes' },
    minimum: { label: t('minimum'), cls: 'compatMaybe' },
    incompatible: { label: t('incompatible'), cls: 'compatNo' },
    unknown: { label: t('check_now'), cls: 'compatUnknown' },
  };

  const { label, cls } = COMPAT_CONFIG[compat];

  useEffect(() => {
    const query = game.steamId ? `steamId=${game.steamId}` : `gameName=${encodeURIComponent(game.name)}`;
    fetch(`/api/games/players?${query}`)
      .then(r => r.json())
      .then(data => setStats({ players: data.playerCount, downloads: data.downloads }))
      .catch(() => setStats({ players: 0, downloads: null }));
  }, [game.steamId, game.name]);

  const formatPlayers = (n) => {
    if (!n) return null;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n;
  };

  return (
    <motion.div
      className={styles.card}
      onClick={() => navigate(`/games/${game.id}`, { state: { igdbGame: game } })}
      whileHover={{ y: MOTION_SETTINGS.hoverLiftAmount }}
      transition={{ duration: MOTION_SETTINGS.hoverLiftSpeed }}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      whileInView={{
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: MOTION_SETTINGS.revealDuration }
      }}
      viewport={{ once: true, margin: "-50px" }}
    >
      <div
        className={styles.thumb}
        style={!game.cover ? { background: game.bgColor || '#1a1a1a' } : {}}
      >
        {game.cover ? (
          <img src={game.cover.url.replace('t_thumb', 't_cover_big')} alt={game.name} className={styles.coverImage} />
        ) : null}
      </div>

      <span className={styles.checkBtn}>
        {t('details')} →
      </span>

      <div className={styles.info}>
        <div className={styles.genre}>{game.genres?.[0]?.name || game.genre}</div>
        <div className={styles.name}>{game.name}</div>

        <div className={styles.cardFooter}>
          <div className={styles.statsRow}>
            {stats.players > 0 && (
              <div className={styles.playerCount}>
                <span className={styles.livePulse} />
                {formatPlayers(stats.players)} {t('live')}
              </div>
            )}
            {stats.downloads && stats.downloads !== 'N/A' && (
              <div className={styles.downloadCount}>
                <span className={styles.downloadIcon}>⬇</span>
                {stats.downloads}
              </div>
            )}
          </div>

          <span className={`${styles.compat} ${styles[cls]}`}>
            <span className={styles.dot} />
            {label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
