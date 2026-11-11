import type { DocumentDto } from '@takam/contracts';
import { messages } from '../../i18n/messages';
import { formatDate } from '../../utils/format-date';
import { Icon } from '../Icon/Icon';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import styles from './DocumentPanel.module.css';

interface DocumentPanelProps {
  readonly document: DocumentDto;
}

/**
 * One document, in the order of the official site: its kind, number and title, the link to its page, then the facts (main
 * chapter, sub-chapter, kind, in force, since, until, version), then the description and the keywords when it has them.
 */
export function DocumentPanel({ document }: DocumentPanelProps) {
  return (
    <article className={styles.panel}>
      <header className={styles.head}>
        <h2 className={styles.title}>
          {messages.documentTypes[document.type]} {messages.documentNumber} <bdi dir="ltr">{document.code ?? document.codeText}</bdi> – {document.title}
        </h2>
        <StatusBadge isInForce={document.isInForce} />
      </header>

      <div className={styles.file}>
        <a className={styles.fileLink} href={document.officialPageUrl} target="_blank" rel="noopener noreferrer">
          <Icon name="document" />
          {messages.officialPage}
          <Icon name="external" />
        </a>
      </div>

      <dl className={styles.facts}>
        <Fact label={messages.detailMainChapter} value={document.mainChapterTitle ?? messages.noChapter} />
        <Fact label={messages.detailSubChapter} value={document.chapterTitle ?? messages.noChapter} />
        <Fact label={messages.detailType} value={messages.documentTypes[document.type]} />
        <Fact label={messages.detailInForce} value={document.isInForce ? messages.detailYes : messages.detailNo} />
        <Fact label={messages.detailValidFrom} value={document.validFrom === null ? messages.detailNoDate : formatDate(document.validFrom)} />
        <Fact label={messages.detailValidTo} value={document.validTo === null ? messages.detailNoEnd : formatDate(document.validTo)} />
        <Fact label={messages.detailVersion} value={String(document.version)} />
      </dl>

      {document.description !== null ? (
        <section className={styles.section} aria-labelledby="description-title">
          <h3 id="description-title" className={styles.sectionTitle}>
            {messages.detailDescription}
          </h3>
          <p className={styles.description}>{document.description}</p>
        </section>
      ) : null}

      {document.keywords.length > 0 ? (
        <section className={styles.section} aria-labelledby="keywords-title">
          <h3 id="keywords-title" className={styles.sectionTitle}>
            {messages.keywords}
          </h3>
          <ul className={styles.keywords}>
            {document.keywords.map((keyword) => (
              <li key={keyword} className={styles.keyword}>
                {keyword}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className={styles.fact}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
