import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import styles from './Hero.module.css';
import { searchGames } from '../../api/igdb';
import useDebounce from '../../hooks/useDebounce';

// ── CHANGE VELOCITY HERE ───────────────────────────────────────────────────
const MOTION_SETTINGS = {
  staggerDelay: 1,    // Gap between items appearing (lower is faster)
  fadeInDuration: 1,  // Duration of each individual fade (lower is faster)
};
// ─────────────────────────────────────────────────────────────────────────────

export default function Hero() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: MOTION_SETTINGS.fadeInDuration }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: MOTION_SETTINGS.staggerDelay }
    }
  };

  useEffect(() => {
    async function fetchResults() {
      if (debouncedQuery.trim().length > 2) {
        setIsSearching(true);
        try {
          const fetchedResults = await searchGames(debouncedQuery);
          setResults(fetchedResults);
          setShowDropdown(true);
        } catch (error) {
          console.error("Failed to search games:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }
    fetchResults();
  }, [debouncedQuery]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (query.trim()) {
      if (results.length > 0) {
        navigate(`/games/${results[0].id}`);
      } else {
        document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleResultClick = (game) => {
    navigate(`/games/${game.id}`, { state: { igdbGame: game } });
    setShowDropdown(false);
    setQuery('');
  };

  const STATS = [
    { value: '12', suffix: 'K+', label: t('games_stat') || 'Games' },
    { value: '4',  suffix: 'M+', label: t('checks_stat') || 'Checks' },
    { value: '99', suffix: '%',  label: t('accuracy_stat') || 'Accuracy' },
    { value: '0',  suffix: '',   label: t('login_stat') || 'Modern' },
  ];

  return (
    <section className={styles.hero}>
      <div className={styles.gridBg} />
      <div className={styles.glow} />

      <motion.div 
        className={styles.content}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className={styles.eyebrow} variants={itemVariants}>
          <span className={styles.eyebrowDot} />
          {t('eyebrow')}
        </motion.div>

        <motion.h1 
          className={styles.heading} 
          variants={itemVariants}
          dangerouslySetInnerHTML={{ __html: t('title') }} 
        />

        <motion.p className={styles.subheading} variants={itemVariants}>
          {t('subtitle')}
        </motion.p>

        <motion.div className={styles.searchContainer} variants={itemVariants}>
          <form className={styles.searchBar} onSubmit={handleSearch}>
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
              onBlur={() => { setTimeout(() => setShowDropdown(false), 200); }}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchBtn}>
              {t('search_btn')}
            </button>
          </form>

          {showDropdown && (
            <motion.div 
              className={styles.dropdown}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {isSearching ? (
                <div className={styles.dropdownItem}>{t('searching')}</div>
              ) : results.length > 0 ? (
                results.map((game) => (
                  <div
                    key={game.id}
                    className={styles.dropdownItem}
                    onClick={() => handleResultClick(game)}
                  >
                    {game.cover?.url ? (
                      <img src={game.cover.url} alt={game.name} className={styles.thumbnail} />
                    ) : (
                      <div className={styles.thumbnailPlaceholder}></div>
                    )}
                    <div>
                      <div className={styles.gameName}>{game.name}</div>
                      <div className={styles.gameGenre}>
                        {game.genres && game.genres.length > 0
                          ? game.genres.map((g) => g.name).join(', ')
                          : 'Game'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.dropdownItem}>{t('no_results')}</div>
              )}
            </motion.div>
          )}
        </motion.div>

        <motion.div className={styles.stats} variants={itemVariants}>
          {STATS.map((s) => (
            <div key={s.label} className={styles.statItem}>
              <div className={styles.statNum}>
                {s.value}
                <span className={styles.accent}>{s.suffix}</span>
              </div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
