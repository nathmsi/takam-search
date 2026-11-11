import type { DocumentDto } from '@takam/contracts';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { messages } from '../../i18n/messages';
import { Icon } from '../Icon/Icon';
import styles from './TreeList.module.css';

interface SubChapterGroup {
  readonly code: string;
  readonly title: string;
  readonly items: DocumentDto[];
}

interface ChapterGroup {
  readonly code: string;
  readonly title: string;
  readonly subChapters: Map<string, SubChapterGroup>;
}

interface TreeListProps {
  readonly items: readonly DocumentDto[];
  readonly total: number;
  readonly selectedCodeText: string | undefined;
  /** The address query of the filters (`?q=…`), kept on every link so the search survives a click. */
  readonly search: string;
}

/** The documents grouped by chapter, then by sub-chapter, in the order they come in (the server sorts them by number). */
function groupByChapter(items: readonly DocumentDto[]): ChapterGroup[] {
  const chapters: Map<string, ChapterGroup> = new Map();
  for (const item of items) {
    const chapterKey: string = item.mainChapterCode ?? '';
    const chapter: ChapterGroup = chapters.get(chapterKey) ?? { code: chapterKey, title: item.mainChapterTitle ?? messages.noChapter, subChapters: new Map() };
    const subKey: string = item.chapterCode ?? '';
    const sub: SubChapterGroup = chapter.subChapters.get(subKey) ?? { code: subKey, title: item.chapterTitle ?? messages.noChapter, items: [] };
    sub.items.push(item);
    chapter.subChapters.set(subKey, sub);
    chapters.set(chapterKey, chapter);
  }
  return [...chapters.values()];
}

/** Which nodes start closed: with a few chapters, none; with many, all but the one of the selected document. */
function initiallyClosed(groups: ChapterGroup[], selectedChapter: string | undefined): Set<string> {
  if (groups.length <= 2) return new Set();
  return new Set(groups.filter((group) => group.code !== selectedChapter).map((group) => `chapter:${group.code}`));
}

/**
 * The list of documents as the official site draws it: a tree (chapter, sub-chapter, document) with the total and two
 * buttons that open or close every node. The selected document is marked with `aria-current`.
 */
export function TreeList({ items, total, selectedCodeText, search }: TreeListProps) {
  const listId: string = useId();
  const groups: ChapterGroup[] = groupByChapter(items);
  const selectedChapter: string | undefined = items.find((item) => item.codeText === selectedCodeText)?.mainChapterCode ?? undefined;
  const [closed, setClosed] = useState<ReadonlySet<string>>(() => initiallyClosed(groups, selectedChapter));

  const toggle = (key: string): void =>
    setClosed((previous) => {
      const next: Set<string> = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const everyKey: string[] = groups.flatMap((group) => [`chapter:${group.code}`, ...[...group.subChapters.keys()].map((sub) => `sub:${sub}`)]);

  return (
    <div className={styles.tree}>
      <div className={styles.head}>
        <h2 id="tree-heading" className={styles.title}>
          {messages.treeTitle}
        </h2>
        <p className={styles.total} aria-live="polite">
          {messages.treeTotal(total)}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.action} onClick={() => setClosed(new Set())}>
            {messages.expandList}
          </button>
          <button type="button" className={styles.action} onClick={() => setClosed(new Set(everyKey))}>
            {messages.collapseList}
          </button>
        </div>
      </div>
      <ul className={styles.nodes}>
        {groups.map((group) => (
          <li key={group.code}>
            <Node id={`${listId}-c-${group.code}`} code={group.code} title={group.title} isClosed={closed.has(`chapter:${group.code}`)} onToggle={() => toggle(`chapter:${group.code}`)} level="chapter">
              <ul className={styles.nodes}>
                {[...group.subChapters.values()].map((sub) => (
                  <li key={sub.code}>
                    <Node id={`${listId}-s-${sub.code}`} code={sub.code} title={sub.title} isClosed={closed.has(`sub:${sub.code}`)} onToggle={() => toggle(`sub:${sub.code}`)} level="sub">
                      <ul className={styles.items}>
                        {sub.items.map((item) => (
                          <li key={item.codeText}>
                            <Link className={styles.item} to={{ pathname: `/documents/${item.codeText}`, search }} aria-current={item.codeText === selectedCodeText ? 'page' : undefined}>
                              <span className={styles.code} dir="ltr">
                                {item.code ?? item.codeText}
                              </span>
                              <span>{item.title}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </Node>
                  </li>
                ))}
              </ul>
            </Node>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface NodeProps {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly isClosed: boolean;
  readonly onToggle: () => void;
  readonly level: 'chapter' | 'sub';
  readonly children: ReactNode;
}

/** A chapter or a sub-chapter: a button that opens and closes what is inside it. */
function Node({ id, code, title, isClosed, onToggle, level, children }: NodeProps) {
  return (
    <>
      <button type="button" className={`${styles.node} ${level === 'chapter' ? styles.chapter : styles.sub}`} aria-expanded={!isClosed} aria-controls={id} onClick={onToggle}>
        <Icon name="chevron" className={`${styles.chevron} ${isClosed ? styles.closed : ''}`} />
        {code !== '' ? (
          <span className={styles.code} dir="ltr">
            {code}
          </span>
        ) : null}
        <span>{title}</span>
      </button>
      <div id={id} hidden={isClosed}>
        {children}
      </div>
    </>
  );
}
