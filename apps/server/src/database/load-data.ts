import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite, Transaction } from '@electric-sql/pglite';

// The two kinds of object of the Takam site, as `GET /api/Chapter` and `GET /api/Document` gave them (only the fields we read).
interface SiteChapter {
  readonly sfid: string;
  readonly name: string;
  readonly rtn_codetext__c: string;
  readonly rtn_chaptertype__c: 'Main' | 'Secondary';
  readonly rtn_parentchapter__c: string | null;
}

interface SiteDocument {
  readonly id: number;
  readonly sfid: string;
  readonly name: string;
  readonly documenttype: string;
  readonly documentcodetext: string | null;
  readonly description: string | null;
  readonly keywords: string | null;
  readonly versionnumber: number;
  readonly datevalidfrom: string | null;
  readonly datevalidto: string | null;
  readonly mainchaptercode: number | null;
  readonly subchaptercode: number | null;
  readonly firstnamechapter: string | null;
  readonly secondnamechapter: string | null;
  readonly secondchapternumber: string | null;
  readonly relatedtochapter: string | null;
  readonly parentdocument: string | null;
}

/** The chapters that were written, and which chapter an id of the site stands for. */
interface ChapterIndex {
  readonly codes: Set<string>;
  readonly codeOfSiteId: Map<string, string>;
}

const DATA_DIRECTORY: string = join(__dirname, '..', '..', 'data');

function readJson<T>(fileName: string): T {
  return JSON.parse(readFileSync(join(DATA_DIRECTORY, fileName), 'utf8')) as T;
}

/** Text as it is shown: no invisible direction marks, nothing for a blank. */
function clean(text: string | null): string | null {
  const cleaned: string = (text ?? '').replace(/[‎‏]/g, '').trim();
  return cleaned === '' ? null : cleaned;
}

/**
 * Fills the empty database from the two files of `data/` (the objects of the Takam site). Only the documents that have a
 * number (`H.1.2.1`) are kept: the others are files attached to a form, which nobody looks for.
 */
export async function loadData(db: PGlite): Promise<void> {
  const chapters: SiteChapter[] = readJson('Chapter.json');
  const documents: SiteDocument[] = readJson<SiteDocument[]>('Document.json').filter((document) => document.documentcodetext);
  await db.transaction(async (transaction) => {
    const index: ChapterIndex = await insertChapters(transaction, chapters, documents);
    await insertDocuments(transaction, documents, index);
    await putChildrenInTheChapterOfTheirParent(transaction);
  });
}

/** A form, a message or a temporary instruction has no chapter of its own: it sits in the chapter of the instruction it belongs to. */
async function putChildrenInTheChapterOfTheirParent(transaction: Transaction): Promise<void> {
  await transaction.query(
    `UPDATE documents child SET chapter_code = parent.chapter_code
     FROM documents parent
     WHERE child.parent_id = parent.id AND child.chapter_code IS NULL AND parent.chapter_code IS NOT NULL`,
  );
}

async function insertChapters(transaction: Transaction, chapters: SiteChapter[], documents: SiteDocument[]): Promise<ChapterIndex> {
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

async function insertDocuments(transaction: Transaction, documents: SiteDocument[], index: ChapterIndex): Promise<void> {
  const idOfSiteId: Map<string, number> = new Map(documents.map((document) => [document.sfid, document.id]));
  for (const document of documents) {
    const codeText = document.documentcodetext as string;
    await transaction.query(
      `INSERT INTO documents (id, code_text, code, title, type, description, keywords, version, valid_from, valid_to, chapter_code, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        document.id,
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
      ],
    );
  }
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
