import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

const FOOTER_LINKS = {
  Platform: [
    { label: 'Can You RUN It', href: '/' },
    { label: 'Can I Run AI',   href: '/ai' },
    { label: 'Game Lists',     href: '/games' },
    { label: 'Rate My PC',     href: '/rate' },
  ],
  Tools: [
    { label: 'GPU Compare',     href: '/gpu-compare' },
    { label: 'Latency Test',    href: '/latency' },
    { label: 'What Will RUN It', href: '/what-will-run' },
  ],
  Company: [
    { label: 'About',          href: '/about' },
    { label: 'Blog',           href: '/blog' },
    { label: 'Contact',        href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
};

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link to="/" className={styles.logo}>
              <div className={styles.logoIcon}>R</div>
              Can You RUN It
            </Link>
            <p className={styles.tagline}>
              The fastest way to check if your PC can handle any game.
              No login, no downloads — just instant answers.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading} className={styles.col}>
              <h4 className={styles.colHeading}>{heading}</h4>
              {links.map((link) => (
                <Link key={link.href} to={link.href} className={styles.colLink}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>
            © {new Date().getFullYear()} Can You RUN It. All rights reserved.
          </p>
          <div className={styles.legal}>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
