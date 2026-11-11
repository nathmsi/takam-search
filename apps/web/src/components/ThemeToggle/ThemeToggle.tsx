import { useTheme } from '../../hooks/useTheme';
import { messages } from '../../i18n/messages';
import { Icon } from '../Icon/Icon';
import styles from './ThemeToggle.module.css';

/** A button that switches between the light and the dark theme. Its name says what it will do, not what it is. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" className={styles.button} onClick={toggleTheme}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      <span className={styles.label}>{theme === 'dark' ? messages.switchToLight : messages.switchToDark}</span>
    </button>
  );
}
