import type { ChapterDto } from '@takam/contracts';
import { Link } from 'react-router';
import { messages } from '../../i18n/messages';
import styles from './TopicTile.module.css';

interface TopicTileProps {
  /** A chapter: it opens the search on that chapter, every kind of document included (so the count is what the list shows). */
  readonly chapter: ChapterDto;
}

/** A topic of the home page: the number of the chapter, its name and how many documents it holds. */
export function TopicTile({ chapter }: TopicTileProps) {
  return (
    <li>
      <Link className={styles.tile} to={{ pathname: '/documents', search: `?chapter=${chapter.code}&type=all` }}>
        <span className={styles.code} dir="ltr">
          {chapter.code}
        </span>
        <span className={styles.title}>{chapter.title}</span>
        <span className={styles.count}>{messages.topicCount(chapter.documentCount)}</span>
      </Link>
    </li>
  );
}
