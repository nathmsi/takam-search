import type { DocumentDetailDto, DocumentType, RelatedDocumentDto } from '@takam/contracts';
import { Link } from 'react-router';
import { messages } from '../../i18n/messages';
import { apiUrl } from '../../services/api-url';
import { formatDate } from '../../utils/format-date';
import { Icon } from '../Icon/Icon';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import styles from './DocumentPanel.module.css';

interface DocumentPanelProps {
  readonly document: DocumentDetailDto;
  /** The address query of the search (`?q=…`), kept on the links to the attached documents. */
  readonly search?: string;
}

/** The kinds of attached document, in the order they are listed. */
const RELATED_ORDER: readonly DocumentType[] = ['Temporary Instruction', 'Message', 'Form', 'Tender Details', 'Tender Maintenance', 'Tender Notice', 'Instruction'];

/**
 * One document, in the order of the official site: its kind, number and title, the link to its file (Word) and to its page, then the facts (main
 * chapter, sub-chapter, kind, in force, since, until, version), then the description and the keywords when it has them.
 */
export function DocumentPanel({ document, search = '' }: DocumentPanelProps) {
  return (
    <article className={styles.panel}>
      <header className={styles.head}>
        <h2 className={styles.title}>
          {messages.documentTypes[document.type]} {messages.documentNumber} <bdi dir="ltr">{document.code ?? document.codeText}</bdi> – {document.title}
        </h2>
        <StatusBadge isInForce={document.isInForce} />
      </header>

      <div className={styles.file}>
        <a className={styles.fileLink} href={apiUrl(document.fileUrl)} target="_blank" rel="noopener noreferrer">
          <Icon name="download" />
          {messages.downloadFile}
        </a>
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

      {RELATED_ORDER.map((type) => {
        const items: RelatedDocumentDto[] = document.related.filter((item) => item.type === type);
        return items.length === 0 ? null : <RelatedSection key={type} type={type} items={items} search={search} />;
      })}
    </article>
  );
}

function RelatedSection({ type, items, search }: { readonly type: DocumentType; readonly items: readonly RelatedDocumentDto[]; readonly search: string }) {
  const headingId = `related-${type.replace(/\s/g, '-')}`;
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.sectionTitle}>
        {messages.relatedTitles[type]}
      </h3>
      <ul className={styles.related}>
        {items.map((item) => (
          <li key={item.codeText} className={styles.relatedItem}>
            <Link className={styles.relatedTitle} to={{ pathname: `/documents/${item.codeText}`, search }}>
              {item.title}
            </Link>
            <StatusBadge isInForce={item.isInForce} />
            <dl className={styles.relatedDates}>
              <div>
                <dt>{messages.relatedValidFrom}</dt>
                <dd>{item.validFrom === null ? messages.detailNoDate : formatDate(item.validFrom)}</dd>
              </div>
              <div>
                <dt>{messages.detailValidTo}</dt>
                <dd>{item.validTo === null ? '' : formatDate(item.validTo)}</dd>
              </div>
            </dl>
            <a className={styles.relatedFile} href={apiUrl(item.fileUrl)} target="_blank" rel="noopener noreferrer" aria-label={messages.downloadFileOf(item.title)} title={messages.downloadFile}>
              <Icon name="download" />
            </a>
          </li>
        ))}
      </ul>
    </section>
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
