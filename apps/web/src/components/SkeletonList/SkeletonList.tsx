import { messages } from '../../i18n/messages';
import styles from './SkeletonList.module.css';

const PLACEHOLDERS: readonly number[] = [0, 1, 2, 3];

/** Grey shapes where the results will be, so the page does not jump when they arrive; announced once as "loading". */
export function SkeletonList() {
  return (
    <div role="status" aria-busy="true">
      <span className={styles.srOnly}>{messages.loading}</span>
      <ul className={styles.list} aria-hidden="true">
        {PLACEHOLDERS.map((index) => (
          <li key={index} className={styles.card}>
            <span className={`${styles.bar} ${styles.short}`} />
            <span className={`${styles.bar} ${styles.long}`} />
            <span className={`${styles.bar} ${styles.medium}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}
