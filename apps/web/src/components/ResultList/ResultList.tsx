import type { DocumentDto } from '@takam/contracts';
import { Link } from 'react-router';
import { messages } from '../../i18n/messages';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import styles from './ResultList.module.css';

interface ResultListProps {
  readonly items: readonly DocumentDto[];
  readonly total: number;
  /** No document has every word: these are the closest ones. */
  readonly relaxed: boolean;
  /** The list comes from the search by meaning (an experiment). */
  readonly meaning: boolean;
  readonly selectedCodeText: string | undefined;
  /** The address query of the filters (`?q=…`), kept on every link so the search survives a click. */
  readonly search: string;
}

/** The result of a search with words: a flat list, the best match first (the server ranks them). */
export function ResultList({ items, total, relaxed, meaning, selectedCodeText, search }: ResultListProps) {
  return (
    <div className={styles.results}>
      <div className={styles.head}>
        <h2 id="tree-heading" className={styles.title}>
          {messages.treeTitle}
        </h2>
        <p className={styles.total} aria-live="polite">
          {messages.treeTotal(total)}
        </p>
        {meaning ? (
          <p className={styles.relaxed} role="status">
            {messages.meaningNotice}
          </p>
        ) : null}
        {relaxed ? (
          <p className={styles.relaxed} role="status">
            {messages.relaxedNotice}
          </p>
        ) : null}
      </div>
      <ol className={styles.list}>
        {items.map((item) => (
          <li key={item.codeText}>
            <Link className={styles.item} to={{ pathname: `/documents/${item.codeText}`, search }} aria-current={item.codeText === selectedCodeText ? 'page' : undefined}>
              <span className={styles.top}>
                <span className={styles.code} dir="ltr">
                  {item.code ?? item.codeText}
                </span>
                <span className={styles.type}>{messages.documentTypes[item.type]}</span>
                <StatusBadge isInForce={item.isInForce} />
              </span>
              <span className={styles.name}>{item.title}</span>
              {item.mainChapterTitle !== null ? (
                <span className={styles.where}>
                  {item.mainChapterTitle} · {item.chapterTitle}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
