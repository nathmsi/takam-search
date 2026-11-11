import { messages } from '../../i18n/messages';
import { Icon } from '../Icon/Icon';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  readonly isInForce: boolean;
}

/** In force or not: said by a word and an icon, never by the color alone. */
export function StatusBadge({ isInForce }: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${isInForce ? styles.inForce : styles.notInForce}`}>
      <Icon name={isInForce ? 'check' : 'clock'} className={styles.icon} />
      {isInForce ? messages.validityYes : messages.validityNo}
    </span>
  );
}
