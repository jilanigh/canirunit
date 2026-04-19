import { useState, useEffect, useMemo } from 'react';
import { getTrendingGames } from '../../api/igdb';
import GameCard from '../../components/GameCard/GameCard';
import { getCompatibility } from '../../hooks/useSpecs';
import styles from './WhatWillRun.module.css';

export default function WhatWillRun({ specs }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('recommended');

  useEffect(() => {
    async function fetchAll() {
      try {
        const data = await getTrendingGames();
        setGames(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // Compute compatibility for every game once — not 3x per render
  const gamesWithCompat = useMemo(
    () => games.map(g => ({ game: g, compat: getCompatibility(g, specs) })),
    [games, specs]
  );

  const stats = useMemo(() => ({
    recommended: gamesWithCompat.filter(({ compat }) => compat === 'recommended').length,
    minimum    : gamesWithCompat.filter(({ compat }) => compat === 'minimum').length,
    total      : gamesWithCompat.length,
  }), [gamesWithCompat]);

  const compatibleGames = useMemo(
    () => gamesWithCompat
      .filter(({ compat }) =>
        filter === 'recommended'
          ? compat === 'recommended'
          : compat === 'recommended' || compat === 'minimum'
      )
      .map(({ game }) => game),
    [gamesWithCompat, filter]
  );

  const crushPercentage = stats.total
    ? Math.round((stats.recommended / stats.total) * 100)
    : 0;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>Hardware Scan Result</div>
        <h1 className={styles.title}>What Will <span className={styles.accent}>RUN</span> It</h1>

        <div className={styles.dashboard}>
          <div className={styles.meterContainer}>
            <div className={styles.meter}>
              <div className={styles.meterFill} style={{ width: `${crushPercentage}%` }} />
            </div>
            <div className={styles.meterLabel}>
              Your PC can crush{' '}
              <strong>{loading ? '…' : `${crushPercentage}%`}</strong>{' '}
              of trending games at Recommended settings!
            </div>
          </div>

          <div className={styles.quickStats}>
            <div className={styles.statBox}>
              <div className={styles.statVal}>{loading ? '—' : stats.recommended}</div>
              <div className={styles.statName}>Recommended</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statVal}>{loading ? '—' : stats.minimum}</div>
              <div className={styles.statName}>Minimum Only</div>
            </div>
          </div>
        </div>

        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === 'recommended' ? styles.active : ''}`}
            onClick={() => setFilter('recommended')}
          >
            Recommended Only
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'minimum' ? styles.active : ''}`}
            onClick={() => setFilter('minimum')}
          >
            Show All Playable
          </button>
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}>Analyzing games against your hardware…</div>
      ) : compatibleGames.length === 0 ? (
        <div className={styles.loading}>
          No games matched at this filter level — try "Show All Playable".
        </div>
      ) : (
        <div className={styles.grid}>
          {compatibleGames.map(game => (
            <GameCard key={game.id} game={game} specs={specs} />
          ))}
        </div>
      )}
    </div>
  );
}
