import type { SiteChapter } from './site-chapter';
import type { SiteData } from './site-data';
import type { SiteDocument } from './site-document';
import type { SqlRunner } from './sql-runner';
import type { TransactionRunner } from './transaction-runner';

/** The chapters that were written, and which chapter an id of the site stands for. */
interface ChapterIndex {
  readonly codes: Set<string>;
  readonly codeOfSiteId: Map<string, string>;
}

/** Text as it is shown: no invisible direction marks, nothing for a blank. */
function clean(text: string | null): string | null {
  const cleaned: string = (text ?? '').replace(/[‎‏]/g, '').trim();
  return cleaned === '' ? null : cleaned;
}

/**
 * Fills the empty database from the data of the Takam site. Only the documents that have a number (`H.1.2.1`) are kept: the
 * others are files attached to a form, which nobody looks for. It fills PGlite as well as the remote database (`pnpm db:push`):
 * the documents go in one query, so the distance to a remote database costs one trip, not 900.
 */
export async function loadData(db: TransactionRunner, data: SiteData): Promise<void> {
  const documents: SiteDocument[] = data.documents.filter((document) => document.documentcodetext);
  await db.transaction(async (transaction) => {
    const index: ChapterIndex = await insertChapters(transaction, data.chapters, documents);
    await insertDocuments(transaction, documents, index);
    await putChildrenInTheChapterOfTheirParent(transaction);
  });
}

/** A form, a message or a temporary instruction has no chapter of its own: it sits in the chapter of the instruction it belongs to. */
async function putChildrenInTheChapterOfTheirParent(transaction: SqlRunner): Promise<void> {
  await transaction.query(
    `UPDATE documents child SET chapter_code = parent.chapter_code
     FROM documents parent
     WHERE child.parent_id = parent.id AND child.chapter_code IS NULL AND parent.chapter_code IS NOT NULL`,
  );
}

async function insertChapters(transaction: SqlRunner, chapters: SiteChapter[], documents: SiteDocument[]): Promise<ChapterIndex> {
  const index: ChapterIndex = { codes: new Set(), codeOfSiteId: new Map() };
  const add = async (code: string, title: string, parentCode: string | null): Promise<void> => {
    await transaction.query('INSERT INTO chapters (code, title, parent_code) VALUES ($1, $2, $3)', [code, title, parentCode]);
    index.codes.add(code);
  };
  for (const chapter of chapters.filter((item) => item.rtn_chaptertype__c === 'Main')) {
    await add(chapter.rtn_codetext__c, clean(chapter.name) as string, null);
    index.codeOfSiteId.set(chapter.sfid, chapter.rtn_codetext__c);
  }
  for (const chapter of chapters.filter((item) => item.rtn_chaptertype__c === 'Secondary')) {
    await add(chapter.rtn_codetext__c, clean(chapter.name) as string, index.codeOfSiteId.get(chapter.rtn_parentchapter__c ?? '') ?? null);
    index.codeOfSiteId.set(chapter.sfid, chapter.rtn_codetext__c);
  }
  await addChaptersMissingFromTheSite(add, index, documents);
  return index;
}

/** A chapter the site does not list (chapter 10) is still named by its documents: it is recreated from them. */
async function addChaptersMissingFromTheSite(
  add: (code: string, title: string, parentCode: string | null) => Promise<void>,
  index: ChapterIndex,
  documents: SiteDocument[],
): Promise<void> {
  for (const document of documents) {
    const main: string = String(document.mainchaptercode);
    const mainTitle: string | null = clean(document.firstnamechapter);
    if (document.mainchaptercode !== null && mainTitle !== null && !index.codes.has(main)) await add(main, mainTitle, null);
    const sub = `${main}.${document.subchaptercode}`;
    const subTitle: string | null = clean(document.secondnamechapter);
    if (document.subchaptercode !== null && subTitle !== null && index.codes.has(main) && !index.codes.has(sub)) await add(sub, subTitle, main);
  }
}

// The columns of `documents` that are written, in the order of `documentRow`, with the type of each one: they go as one array per column.
const DOCUMENT_COLUMNS: readonly { readonly name: string; readonly type: string }[] = [
  { name: 'id', type: 'int' },
  { name: 'site_id', type: 'text' },
  { name: 'code_text', type: 'text' },
  { name: 'code', type: 'text' },
  { name: 'title', type: 'text' },
  { name: 'type', type: 'text' },
  { name: 'description', type: 'text' },
  { name: 'keywords', type: 'text' },
  { name: 'version', type: 'int' },
  { name: 'valid_from', type: 'date' },
  { name: 'valid_to', type: 'date' },
  { name: 'chapter_code', type: 'text' },
  { name: 'parent_id', type: 'int' },
];

const INSERT_DOCUMENTS_SQL = `INSERT INTO documents (${DOCUMENT_COLUMNS.map((column) => column.name).join(', ')})
  SELECT * FROM unnest(${DOCUMENT_COLUMNS.map((column, position) => `$${position + 1}::${column.type}[]`).join(', ')})`;

function documentRow(document: SiteDocument, index: ChapterIndex, idOfSiteId: Map<string, number>): unknown[] {
  const codeText = document.documentcodetext as string;
  return [
    document.id,
    document.sfid,
    codeText,
    codeText.replace(/^[A-Za-z]+\./, ''),
    clean(document.name),
    document.documenttype,
    clean(document.description),
    clean(document.keywords),
    document.versionnumber,
    document.datevalidfrom?.slice(0, 10) ?? null,
    document.datevalidto?.slice(0, 10) ?? null,
    chapterOf(document, index),
    idOfSiteId.get(document.parentdocument ?? '') ?? null,
  ];
}

async function insertDocuments(transaction: SqlRunner, documents: SiteDocument[], index: ChapterIndex): Promise<void> {
  const idOfSiteId: Map<string, number> = new Map(documents.map((document) => [document.sfid, document.id]));
  const rows: unknown[][] = documents.map((document) => documentRow(document, index, idOfSiteId));
  await transaction.query(INSERT_DOCUMENTS_SQL, DOCUMENT_COLUMNS.map((_, position) => rows.map((row) => row[position])));
}

/**
 * The sub-chapter of a document. The site writes it twice: in fields meant for display (empty for a few documents, which
 * then do not show in its tree) and in `relatedtochapter` (always there). The second one is read first.
 */
function chapterOf(document: SiteDocument, index: ChapterIndex): string | null {
  const fromSiteId: string | undefined = index.codeOfSiteId.get(document.relatedtochapter ?? document.secondchapternumber ?? '');
  if (fromSiteId !== undefined) return fromSiteId;
  const fromNumbers = `${document.mainchaptercode}.${document.subchaptercode}`;
  return index.codes.has(fromNumbers) ? fromNumbers : null;
}
