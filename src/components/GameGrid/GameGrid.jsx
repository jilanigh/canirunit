import { useState, useEffect } from 'react';
import styles from './GameGrid.module.css';
import GameCard from '../GameCard/GameCard';
import { getTrendingGames } from '../../api/igdb';

// Skeleton placeholder shown while games load
function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonThumb} />
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonLine} style={{ width: '40%', height: '12px' }} />
        <div className={styles.skeletonLine} style={{ width: '75%', height: '18px', marginTop: '8px' }} />
        <div className={styles.skeletonLine} style={{ width: '55%', height: '12px', marginTop: '12px' }} />
      </div>
    </div>
  );
}

export default function GameGrid({ specs }) {
  const [games, setGames] = useState([]);
  const [visible, setVisible] = useState(12);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGames() {
      try {
        const trending = await getTrendingGames();
        setGames(trending);
      } catch (error) {
        console.error('Failed to load trending games:', error);
      } finally {
        setLoading(false);
      }
    }
    loadGames();
  }, []);

  const loadMore = () => setVisible(prev => prev + 24);

  return (
    <section className={styles.section} id="games">
      <div className={styles.header}>
        <h2 className={styles.title}>
          Explore <span className={styles.accent}>Games Library</span>
        </h2>
        <span className={styles.subtext}>
          {loading ? 'Loading…' : `${games.length} titles available live`}
        </span>
      </div>

      <div className={styles.grid}>
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
          : games.slice(0, visible).map((game) => (
            <GameCard key={game.id} game={game} specs={specs} />
          ))
        }
      </div>

      {!loading && visible < games.length && (
        <div className={styles.loadMoreContainer}>
          <button onClick={loadMore} className={styles.loadMoreBtn}>
            Discover More Games{' '}
            <span className={styles.countBadge}>{games.length - visible} remaining</span>
          </button>
        </div>
      )}
    </section>
  );
}
