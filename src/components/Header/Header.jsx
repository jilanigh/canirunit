import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import styles from './Header.module.css';
import { NAV_LINKS } from '../../data/games';

export default function Header({ onDetectClick }) {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>⚡</div>
          Can You RUN It
        </Link>

        <nav className={styles.nav}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`${styles.navLink} ${pathname === link.href ? styles.navLinkActive : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.controls}>
          <div className={styles.langGroup}>
            <button onClick={() => changeLanguage('en')} className={i18n.language === 'en' ? styles.activeLang : ''}>EN</button>
            <button onClick={() => changeLanguage('fr')} className={i18n.language === 'fr' ? styles.activeLang : ''}>FR</button>
            <button onClick={() => changeLanguage('ar')} className={i18n.language === 'ar' ? styles.activeLang : ''}>عربي</button>
          </div>

          <button className={styles.themeToggle} onClick={toggleTheme}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          <button className={styles.btnPrimary} onClick={onDetectClick}>
            {t('specs.detect')}
          </button>
        </div>
      </div>
    </header>
  );
}
