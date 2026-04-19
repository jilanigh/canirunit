import { useState, useEffect, useCallback } from 'react';
import { getTrendingGames } from '../../api/igdb';
import GameCard from '../../components/GameCard/GameCard';
import styles from './GameList.module.css';

function SkeletonCard() {
  return (
    <div style={{
      borderRadius: '12px', overflow: 'hidden',
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        width: '100%', aspectRatio: '3/4',
        background: 'linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.10) 50%,rgba(255,255,255,0.05) 75%)',
        backgroundSize: '800px 100%', animation: 'shimmer 1.4s infinite linear',
      }} />
      <div style={{ padding: '12px 16px 16px' }}>
        <div style={{ height: 12, width: '40%', borderRadius: 6, marginBottom: 8,
          background: 'rgba(255,255,255,0.07)', animation: 'shimmer 1.4s infinite linear' }} />
        <div style={{ height: 18, width: '75%', borderRadius: 6,
          background: 'rgba(255,255,255,0.07)', animation: 'shimmer 1.4s infinite linear' }} />
      </div>
    </div>
  );
}

const PAGE_SIZE = 24;

export default function GameList({ specs }) {
  const [games,         setGames]         = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [search,        setSearch]        = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [visible,       setVisible]       = useState(PAGE_SIZE);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTrendingGames();
      setGames(data);
      setFilteredGames(data);
    } catch (e) {
      console.error('[GameList] fetch error:', e.message);
      setError(e.message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Re-filter on search / genre changes
  useEffect(() => {
    let result = games;
    if (search.trim()) {
      result = result.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (selectedGenre !== 'All') {
      result = result.filter(g => g.genre === selectedGenre);
    }
    setFilteredGames(result);
    setVisible(PAGE_SIZE);
  }, [search, selectedGenre, games]);

  const genres = ['All', ...new Set(games.map(g => g.genre).filter(Boolean))];
  const shown  = filteredGames.slice(0, visible);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>All PC Games</h1>
        <p className={styles.subtitle}>
          {loading ? 'Loading games…' : error ? 'Could not load games' : `${games.length} games — check your compatibility instantly.`}
        </p>

        <div className={styles.controls}>
          <input
            type="text"
            placeholder="Search games..."
            className={styles.searchBar}
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={loading || !!error}
          />
          <select
            className={styles.genreFilter}
            value={selectedGenre}
            onChange={e => setSelectedGenre(e.target.value)}
            disabled={loading || !!error}
          >
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </header>

      {/* Error state with retry */}
      {!loading && error && (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          color: 'var(--muted)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '1rem',
        }}>
          <div style={{ fontSize: '2.5rem' }}>😵</div>
          <p style={{ fontSize: '1rem' }}>Failed to load games: <strong style={{ color: '#ff3b3b' }}>{error}</strong></p>
          <button
            onClick={fetchAll}
            style={{
              padding: '10px 28px', borderRadius: '8px', cursor: 'pointer',
              background: 'var(--accent-dim)', color: 'var(--accent)',
              border: '1px solid var(--accent-border)', fontSize: '0.95rem',
              fontFamily: 'var(--font-head)', fontWeight: 600, letterSpacing: '0.5px',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Game grid */}
      {!error && (
        <div className={styles.grid}>
          {loading
            ? Array.from({ length: 24 }).map((_, i) => <SkeletonCard key={i} />)
            : shown.map(game => <GameCard key={game.id} game={game} specs={specs} />)
          }
        </div>
      )}

      {!loading && !error && filteredGames.length === 0 && (
        <div className={styles.noResults}>No games found matching your filters.</div>
      )}

      {!loading && !error && visible < filteredGames.length && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <button
            onClick={() => setVisible(v => v + PAGE_SIZE)}
            style={{
              padding: '12px 32px', borderRadius: '10px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.08)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.95rem',
            }}
          >
            Load more — {filteredGames.length - visible} remaining
          </button>
        </div>
      )}
    </div>
  );
}
