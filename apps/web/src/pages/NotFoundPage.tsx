import { useNavigate } from 'react-router';
import { StateMessage } from '../components/StateMessage/StateMessage';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { messages } from '../i18n/messages';
import styles from './NotFoundPage.module.css';

/** Any address the app does not know. */
export function NotFoundPage() {
  const navigate = useNavigate();
  useDocumentTitle(messages.pageNotFoundTitle);
  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <StateMessage kind="empty" title={messages.pageNotFoundTitle} hint={messages.documentNotFoundHint} action={{ label: messages.backToSearch, onClick: () => void navigate('/') }} />
    </main>
  );
}
