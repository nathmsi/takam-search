import { useId } from 'react';
import { messages } from '../../i18n/messages';
import { Icon } from '../Icon/Icon';
import styles from './SearchBox.module.css';

/** A small on/off button inside the field (an experiment kept out of the way). */
interface SearchBoxToggle {
  /** Its name, read by screen readers and shown on hover. */
  readonly label: string;
  readonly isOn: boolean;
  readonly onToggle: (isOn: boolean) => void;
}

interface SearchBoxProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** The visible label (never a placeholder alone). */
  readonly label: string;
  readonly placeholder?: string;
  /** `pill` is the thin rounded field of the home page; `large` a tall one; `compact` sits in a row of filters. */
  readonly size?: 'large' | 'compact' | 'pill';
  readonly toggle?: SearchBoxToggle;
}

/** The search field: a visible label, a clear button once there is text, and an optional small toggle. */
export function SearchBox({ value, onChange, label, placeholder, size = 'large', toggle }: SearchBoxProps) {
  const id: string = useId();
  return (
    <div className={styles.root}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.field}>
        <Icon name="search" className={styles.searchIcon} />
        <input
          id={id}
          className={`${styles.input} ${size === 'compact' ? styles.compact : ''} ${size === 'pill' ? styles.pill : ''} ${toggle ? styles.withToggle : ''}`}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        {toggle ? (
          <button
            type="button"
            className={`${styles.toggle} ${value !== '' ? styles.beforeClear : ''} ${toggle.isOn ? styles.on : ''}`}
            aria-pressed={toggle.isOn}
            aria-label={toggle.label}
            title={toggle.label}
            onClick={() => toggle.onToggle(!toggle.isOn)}
          >
            <Icon name="sparkle" />
          </button>
        ) : null}
        {value !== '' ? (
          <button type="button" className={styles.clear} onClick={() => onChange('')} aria-label={messages.clearSearch}>
            <Icon name="close" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
