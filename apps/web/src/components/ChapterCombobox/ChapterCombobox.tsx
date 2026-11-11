import { useEffect, useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { messages } from '../../i18n/messages';
import { Icon } from '../Icon/Icon';
import styles from './ChapterCombobox.module.css';

/** A chapter or a sub-chapter to choose from. */
export interface ChapterOption {
  readonly code: string;
  readonly title: string;
}

interface ChapterComboboxProps {
  /** The visible label of the field. */
  readonly label: string;
  /** The code chosen, or `''` for all of them. */
  readonly value: string;
  readonly options: readonly ChapterOption[];
  readonly onChange: (code: string) => void;
}

interface Entry {
  readonly code: string;
  readonly text: string;
}

/** Quotes and case do not matter when searching a chapter (`תכ"ם` = `תכם`). */
const squash = (text: string): string => text.replace(/["'״׳]/g, '').toLowerCase();

/**
 * A chapter field you can type in: the list narrows to what is typed (`1.4`, `תשלום`), as on the official site. It is the
 * ARIA "combobox with a list" pattern: arrows move, Enter chooses, Escape closes, a click chooses. Closed, it shows the chapter
 * chosen; open, what is being typed.
 */
export function ChapterCombobox({ label, value, options, onChange }: ChapterComboboxProps) {
  const id: string = useId();
  const listId = `${id}-list`;
  // `null` = closed; a string (empty at first) = open, and what has been typed so far.
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState<number>(0);

  const entries: Entry[] = [{ code: '', text: messages.filterAll }, ...options.map((option) => ({ code: option.code, text: `${option.code} - ${option.title}` }))];
  const chosen: Entry = entries.find((entry) => entry.code === value) ?? entries[0];
  const typed: string = (query ?? '').trim();
  const shown: Entry[] = typed === '' ? entries : entries.filter((entry) => entry.code !== '' && squash(entry.text).includes(squash(typed)));
  const isOpen: boolean = query !== null;
  const activeId: string | undefined = isOpen && shown[active] !== undefined ? `${id}-option-${shown[active].code || 'all'}` : undefined;

  useEffect(() => {
    if (activeId !== undefined) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  const open = (): void => {
    setQuery('');
    setActive(Math.max(0, entries.findIndex((entry) => entry.code === value)));
  };
  const choose = (entry: Entry): void => {
    onChange(entry.code);
    setQuery(null);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) return open();
      const step: number = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => Math.min(Math.max(current + step, 0), shown.length - 1));
    } else if (event.key === 'Enter' && isOpen) {
      event.preventDefault();
      if (shown[active] !== undefined) choose(shown[active]);
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      setQuery(null);
    }
  };

  return (
    <div className={styles.root}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.field}>
        <input
          id={id}
          className={styles.input}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          spellCheck={false}
          value={query ?? chosen.text}
          onClick={() => (isOpen ? undefined : open())}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setQuery(null)}
        />
        <Icon name="chevron" className={styles.chevron} />
        {isOpen ? (
          <div className={styles.popup}>
            <ul id={listId} role="listbox" aria-label={label} className={styles.list}>
              {shown.map((entry, index) => (
                <li
                  key={entry.code || 'all'}
                  id={`${id}-option-${entry.code || 'all'}`}
                  role="option"
                  aria-selected={entry.code === value}
                  className={`${styles.option} ${index === active ? styles.active : ''}`}
                  // Keep the focus in the field: the click then still finds the option.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(entry)}
                >
                  <span className={styles.check}>{entry.code === value ? <Icon name="check" /> : null}</span>
                  {entry.text}
                </li>
              ))}
            </ul>
            {shown.length === 0 ? (
              <p className={styles.none} role="status">
                {messages.chapterNone}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
