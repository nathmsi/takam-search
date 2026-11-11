import { Link, NavLink } from 'react-router';
import { messages } from '../../i18n/messages';
import { Icon } from '../Icon/Icon';
import { MeaningToggle } from '../MeaningToggle/MeaningToggle';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import styles from './AppHeader.module.css';

const TAKAM_SITE = 'https://takam.mof.gov.il/';

/**
 * The band at the top of every page, in the order of the official site: the name, then the way around (home, search),
 * then the tools (the official site, the search by meaning on the search pages, the theme).
 */
export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            <Icon name="search" />
          </span>
          <span className={styles.name}>{messages.appName}</span>
          <span className={styles.poc}>{messages.poc}</span>
        </Link>
        <nav className={styles.nav} aria-label={messages.navLabel}>
          <NavLink to="/" end className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            <Icon name="home" />
            <span className={styles.linkText}>{messages.navHome}</span>
          </NavLink>
          <NavLink to="/documents" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            <Icon name="search" />
            <span className={styles.linkText}>{messages.navSearch}</span>
          </NavLink>
        </nav>
        <div className={styles.tools}>
          <a className={styles.link} href={TAKAM_SITE} target="_blank" rel="noopener noreferrer">
            <Icon name="external" />
            <span className={styles.linkText}>{messages.officialSite}</span>
          </a>
          <MeaningToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
