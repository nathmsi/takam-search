import { useId } from 'react';
import { messages } from '../../i18n/messages';
import { Icon } from '../Icon/Icon';
import styles from './SearchBox.module.css';

interface SearchBoxProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** The visible label (never a placeholder alone). */
  readonly label: string;
  readonly placeholder?: string;
  /** `pill` is the thin rounded field of the home page; `large` a tall one; `compact` sits in a row of filters. */
  readonly size?: 'large' | 'compact' | 'pill';
}

/** The search field: a visible label, a clear button once there is text. */
export function SearchBox({ value, onChange, label, placeholder, size = 'large' }: SearchBoxProps) {
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
          className={`${styles.input} ${size === 'compact' ? styles.compact : ''} ${size === 'pill' ? styles.pill : ''}`}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        {value !== '' ? (
          <button type="button" className={styles.clear} onClick={() => onChange('')} aria-label={messages.clearSearch}>
            <Icon name="close" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
