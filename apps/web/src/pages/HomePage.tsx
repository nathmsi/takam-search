import type { ChapterDto } from '@takam/contracts';
import { useState } from 'react';
import type { SyntheticEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { HeroArt } from '../components/HeroArt/HeroArt';
import { Icon } from '../components/Icon/Icon';
import { SearchBox } from '../components/SearchBox/SearchBox';
import { StateMessage } from '../components/StateMessage/StateMessage';
import { TopicTile } from '../components/TopicTile/TopicTile';
import { useChapters } from '../hooks/useChapters';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { messages } from '../i18n/messages';
import styles from './HomePage.module.css';

/**
 * The home page, in the order and the look of the official site: a slanted deep-blue panel with the welcome and a drawing
 * on one side; on the other the search, the topics (the chapters) and the button to the whole list.
 */
export function HomePage() {
  useDocumentTitle(undefined);
  const navigate = useNavigate();
  const chapters = useChapters();
  const [words, setWords] = useState<string>('');
  const topics: ChapterDto[] = (chapters.data ?? []).filter((chapter) => chapter.parentCode === null);

  const search = (event: SyntheticEvent): void => {
    event.preventDefault();
    const query: string = words.trim() === '' ? '' : `?${new URLSearchParams({ q: words.trim() }).toString()}`;
    void navigate({ pathname: '/documents', search: query });
  };

  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <div className={styles.inner}>
        <section className={styles.welcome} aria-labelledby="welcome-title">
          <div className={styles.welcomeText}>
            <h1 id="welcome-title" className={styles.welcomeTitle}>
              {messages.welcomeTitle}
            </h1>
            <p className={styles.welcomeParagraph}>{messages.welcomeText}</p>
          </div>
          <div className={styles.art}>
            <HeroArt />
          </div>
        </section>

        <div className={styles.entry}>
          <form className={styles.search} role="search" onSubmit={search}>
            <div className={styles.searchField}>
              <SearchBox value={words} onChange={setWords} label={messages.homeSearchLabel} placeholder={messages.homeSearchPlaceholder} size="pill" />
            </div>
            <button type="submit" className={styles.submit}>
              {messages.homeSearchSubmit}
            </button>
          </form>

          <section aria-labelledby="topics-title" className={styles.topics}>
            <h2 id="topics-title" className={styles.topicsTitle}>
              {messages.topicsTitle}
            </h2>
            {chapters.isError ? <StateMessage kind="error" title={messages.errorTitle} hint={messages.topicsError} action={{ label: messages.retry, onClick: () => void chapters.refetch() }} /> : null}
            <ul className={styles.tiles}>
              {topics.map((chapter) => (
                <TopicTile key={chapter.code} chapter={chapter} />
              ))}
            </ul>
          </section>

          <Link className={styles.showAll} to="/documents">
            <Icon name="chevron" className={styles.showAllIcon} />
            {messages.showAll}
          </Link>
        </div>
      </div>
    </main>
  );
}
