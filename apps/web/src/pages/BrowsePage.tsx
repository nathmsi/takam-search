import type { DocumentListDto } from '@takam/contracts';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { DocumentPanel } from '../components/DocumentPanel/DocumentPanel';
import { FilterBar } from '../components/FilterBar/FilterBar';
import { Icon } from '../components/Icon/Icon';
import { ResultList } from '../components/ResultList/ResultList';
import { SkeletonList } from '../components/SkeletonList/SkeletonList';
import { StateMessage } from '../components/StateMessage/StateMessage';
import { TreeList } from '../components/TreeList/TreeList';
import { useChapters } from '../hooks/useChapters';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useDocument } from '../hooks/useDocument';
import { useDocumentList } from '../hooks/useDocumentList';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useIsWideScreen } from '../hooks/useIsWideScreen';
import { messages } from '../i18n/messages';
import { ApiError } from '../services/api-error';
import { buildSearchString } from '../services/build-search-string';
import { DEFAULT_TYPE } from '../services/search-filters';
import type { SearchFilters, TypeFilter } from '../services/search-filters';
import { parseInForceFilter } from '../utils/parse-in-force-filter';
import { parseTypeFilter } from '../utils/parse-type-filter';
import styles from './BrowsePage.module.css';

const TYPING_DELAY_MS = 250;

interface BestMatchRequest {
  readonly list: DocumentListDto | undefined;
  /** The list is the answer to the words now in the address, not the previous list kept on screen while the next one loads. */
  readonly isCurrent: boolean;
  readonly hasWords: boolean;
  readonly isWide: boolean;
}

/**
 * The document to open by itself after a search: the best match (the server ranks them), when the screen shows the list and
 * the document side by side. On a phone opening a document hides the list, so nothing opens by itself there.
 * `undefined` = leave things as they are.
 */
function pickBestMatch({ list, isCurrent, hasWords, isWide }: BestMatchRequest): string | undefined {
  if (!hasWords || !isWide || !isCurrent || list === undefined) return undefined;
  return list.items[0]?.codeText;
}

/**
 * The search page, laid out like the official site: the filters across the top, then the list on one side and the selected
 * document on the other. With words typed the list is the ranked answer of the server; without, the tree of chapters.
 * The filters live in the address (`?q=&chapter=&type=&inForce=&meaning=`) and the selected document in its path
 * (`/documents/H.1.2.1`), so a view can be shared and the back button works.
 */
export function BrowsePage() {
  const { codeText } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const chapter: string = searchParams.get('chapter') ?? '';
  const type: TypeFilter = parseTypeFilter(searchParams.get('type'));
  const inForce = parseInForceFilter(searchParams.get('inForce'));
  const meaning: boolean = searchParams.get('meaning') === 'yes';
  const [draft, setDraft] = useState<string>(() => searchParams.get('q') ?? '');
  const q: string = useDebouncedValue(draft, TYPING_DELAY_MS);

  // The address follows what was typed once the typing stops.
  useEffect(() => {
    setSearchParams(
      (previous) => {
        if ((previous.get('q') ?? '') === q) return previous;
        const next = new URLSearchParams(previous);
        if (q === '') next.delete('q');
        else next.set('q', q);
        return next;
      },
      { replace: true },
    );
  }, [q, setSearchParams]);

  const filters: SearchFilters = { q, chapter, type, inForce, meaning };
  // What the links hand on: the words as typed now, not as the address has them (it follows after a pause).
  const search: string = buildSearchString({ q: draft, chapter, type, inForce, meaning });
  const list = useDocumentList(filters);
  const chapters = useChapters();
  const selected = useDocument(codeText);
  const isWide: boolean = useIsWideScreen();
  const bestMatch: string | undefined = pickBestMatch({ list: list.data, isCurrent: !list.isPlaceholderData, hasWords: q.trim() !== '', isWide });
  const navigate = useNavigate();
  // A search opens its best match once. A document opened from the address (a shared link) or by a click stays: the key of the
  // search it was opened with is already handled.
  const searchKey = `${q}|${chapter}|${type}|${inForce}|${meaning}`;
  const handledSearch = useRef<string>(codeText === undefined ? '' : searchKey);
  useEffect(() => {
    if (bestMatch === undefined || handledSearch.current === searchKey) return;
    handledSearch.current = searchKey;
    navigate({ pathname: `/documents/${bestMatch}`, search }, { replace: true });
  }, [bestMatch, searchKey, search, navigate]);
  useDocumentTitle(selected.data ? `${selected.data.code ?? selected.data.codeText} ${selected.data.title}` : messages.browseTitle);

  const changeParam = (name: 'chapter' | 'type' | 'inForce', value: string, defaultValue: string): void => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value === defaultValue) next.delete(name);
        else next.set(name, value);
        return next;
      },
      { replace: true },
    );
  };
  const clearAll = (): void => {
    setDraft('');
    setSearchParams({}, { replace: true });
  };

  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <h1 className={styles.srOnly}>{messages.browseTitle}</h1>
      <FilterBar
        text={draft}
        chapters={chapters.data ?? []}
        chapter={chapter}
        type={type}
        inForce={inForce}
        onTextChange={setDraft}
        onChapterChange={(value) => changeParam('chapter', value, '')}
        onTypeChange={(value) => changeParam('type', value, DEFAULT_TYPE)}
        onInForceChange={(value) => changeParam('inForce', value, 'all')}
        onClear={clearAll}
      />

      <div className={`${styles.panels} ${codeText === undefined ? '' : styles.hasSelection}`}>
        <section className={styles.list} aria-labelledby="tree-heading">
          {list.isPending ? <SkeletonList /> : null}
          {list.isError ? <StateMessage kind="error" title={messages.errorTitle} hint={messages.errorHint} action={{ label: messages.retry, onClick: () => void list.refetch() }} /> : null}
          {list.data ? (
            <div className={list.isFetching ? styles.refreshing : undefined}>
              {list.data.total === 0 ? (
                <StateMessage kind="empty" title={messages.emptyTitle} hint={messages.emptyHint} action={{ label: messages.clearAll, onClick: clearAll }} />
              ) : q.trim() === '' ? (
                <TreeList key={`${chapter}|${type}|${inForce}`} items={list.data.items} total={list.data.total} selectedCodeText={codeText} search={search} />
              ) : (
                <ResultList items={list.data.items} total={list.data.total} relaxed={list.data.relaxed} meaning={list.data.meaning} selectedCodeText={codeText} search={search} />
              )}
            </div>
          ) : null}
        </section>

        <section className={styles.detail} aria-label={messages.detailRegion}>
          <Link className={styles.back} to={{ pathname: '/documents', search }}>
            <Icon name="back" mirrorInRtl />
            {messages.backToList}
          </Link>
          {codeText === undefined ? <p className={styles.hint}>{messages.pickDocument}</p> : null}
          {codeText !== undefined && selected.isPending ? <SkeletonList /> : null}
          {selected.isError ? (
            selected.error instanceof ApiError && selected.error.status === 404 ? (
              <StateMessage kind="empty" title={messages.documentNotFoundTitle} hint={messages.documentNotFoundHint} />
            ) : (
              <StateMessage kind="error" title={messages.errorTitle} hint={messages.errorHint} action={{ label: messages.retry, onClick: () => void selected.refetch() }} />
            )
          ) : null}
          {selected.data ? <DocumentPanel document={selected.data} /> : null}
        </section>
      </div>
    </main>
  );
}
