import { useLocation, Link } from 'react-router-dom';
import styles from './ComingSoon.module.css';

const TITLES = {
  '/ai': 'Can I Run & AI Predictions',
  '/games': 'Complete Game Lists',
  '/rate': 'Rate My PC',
  '/what-will-run': 'What Will RUN It?',
  '/gpu-compare': 'GPU Comparisons',
  '/latency': 'Latency Test',
};

export default function ComingSoon() {
  const location = useLocation();
  const title = TITLES[location.pathname] || 'Feature in Development';

  return (
    <div className={styles.container}>
      <div className={styles.icon}>🚧</div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>
        We're working hard to bring this feature to life. Check back soon for updates!
      </p>
      
      <div className={styles.card}>
        <div className={styles.statusRow}>
          <span className={styles.dot}></span>
          <span>Status: In Development</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressBar}></div>
        </div>
      </div>

      <Link to="/" className={styles.homeBtn}>
        ← Return Home
      </Link>
    </div>
  );
}
