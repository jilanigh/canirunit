import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Navbar.module.css';

export default function Navbar() {
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
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⚡</span>
          <h1>Can You Run It?</h1>
        </div>

        <div className={styles.controls}>
          <div className={styles.langGroup}>
            <button 
              onClick={() => changeLanguage('en')} 
              className={i18n.language === 'en' ? styles.active : ''}
            >EN</button>
            <button 
              onClick={() => changeLanguage('fr')} 
              className={i18n.language === 'fr' ? styles.active : ''}
            >FR</button>
            <button 
              onClick={() => changeLanguage('ar')} 
              className={i18n.language === 'ar' ? styles.active : ''}
            >عربي</button>
          </div>

          <button className={styles.themeToggle} onClick={toggleTheme}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </nav>
  );
}
