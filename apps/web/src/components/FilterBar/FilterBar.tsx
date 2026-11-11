import type { ChapterDto, InForceFilter } from '@takam/contracts';
import { useId } from 'react';
import { messages } from '../../i18n/messages';
import type { TypeFilter } from '../../services/search-filters';
import { DOCUMENT_TYPES } from '../../utils/parse-type-filter';
import { SearchBox } from '../SearchBox/SearchBox';
import styles from './FilterBar.module.css';

const VALIDITY_OPTIONS: ReadonlyArray<{ readonly value: InForceFilter; readonly label: string }> = [
  { value: 'all', label: messages.filterAll },
  { value: 'yes', label: messages.validityYes },
  { value: 'no', label: messages.validityNo },
];

interface FilterBarProps {
  readonly text: string;
  readonly chapters: readonly ChapterDto[];
  /** `''` for all, a chapter (`1`) or a sub-chapter (`1.4`). */
  readonly chapter: string;
  readonly type: TypeFilter;
  readonly inForce: InForceFilter;
  readonly meaning: boolean;
  readonly onTextChange: (text: string) => void;
  readonly onChapterChange: (chapter: string) => void;
  readonly onTypeChange: (type: TypeFilter) => void;
  readonly onInForceChange: (inForce: InForceFilter) => void;
  readonly onMeaningChange: (meaning: boolean) => void;
  readonly onClear: () => void;
}

/**
 * The band of filters, in the order of the official site: free text, main chapter, sub-chapter, type of information,
 * validity, and "clear". In the free text field, the small experiment toggle "search by meaning". (The site also has "tags": its list is empty in the API, so it is left out.)
 */
export function FilterBar({ text, chapters, chapter, type, inForce, meaning, onTextChange, onChapterChange, onTypeChange, onInForceChange, onMeaningChange, onClear }: FilterBarProps) {
  const mainId: string = useId();
  const subId: string = useId();
  const typeId: string = useId();
  const validityName: string = useId();
  const mainChapter: string = chapter.split('.')[0];
  const subChapter: string = chapter.includes('.') ? chapter : '';
  const mains: ChapterDto[] = chapters.filter((item) => item.parentCode === null);
  const subs: ChapterDto[] = chapters.filter((item) => item.parentCode !== null && (mainChapter === '' || item.parentCode === mainChapter));

  return (
    <form className={styles.band} role="search" aria-label={messages.filtersLabel} onSubmit={(event) => event.preventDefault()}>
      <div className={styles.row}>
        <div className={`${styles.field} ${styles.text}`}>
          <SearchBox value={text} onChange={onTextChange} label={messages.filterFreeText} size="compact" toggle={{ label: messages.filterMeaning, isOn: meaning, onToggle: onMeaningChange }} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={mainId}>
            {messages.filterMainChapter}
          </label>
          <select id={mainId} className={styles.select} value={mainChapter} onChange={(event) => onChapterChange(event.target.value)}>
            <option value="">{messages.filterAll}</option>
            {mains.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} - {item.title}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={subId}>
            {messages.filterSubChapter}
          </label>
          <select id={subId} className={styles.select} value={subChapter} onChange={(event) => onChapterChange(event.target.value || mainChapter)}>
            <option value="">{messages.filterAll}</option>
            {subs.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} - {item.title}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={typeId}>
            {messages.filterType}
          </label>
          <select id={typeId} className={styles.select} value={type} onChange={(event) => onTypeChange(event.target.value as TypeFilter)}>
            <option value="all">{messages.filterAll}</option>
            {DOCUMENT_TYPES.map((documentType) => (
              <option key={documentType} value={documentType}>
                {messages.documentTypes[documentType]}
              </option>
            ))}
          </select>
        </div>
        <fieldset className={`${styles.field} ${styles.fieldset}`}>
          <legend className={styles.label}>{messages.filterValidity}</legend>
          <div className={styles.segments}>
            {VALIDITY_OPTIONS.map((option) => (
              <label key={option.value} className={styles.segment}>
                <input
                  className={styles.radio}
                  type="radio"
                  name={validityName}
                  value={option.value}
                  checked={inForce === option.value}
                  onChange={() => onInForceChange(option.value)}
                />
                <span className={styles.segmentLabel}>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <button type="button" className={styles.clear} onClick={onClear}>
        {messages.clearAll}
      </button>
    </form>
  );
}
