import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { messages } from '../../i18n/messages';
import { AppHeader } from '../AppHeader/AppHeader';
import styles from './AppLayout.module.css';

/** What every page shares: a link to skip to the content, the header, and the page itself. A new page starts at the top. */
export function AppLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
      <a className={styles.skip} href="#main">
        {messages.skipToContent}
      </a>
      <AppHeader />
      <Outlet />
    </>
  );
}
