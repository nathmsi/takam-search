import type { ChapterDto, DocumentDto } from '@takam/contracts';

/** A document for a test: sensible values, only what the test cares about is overridden. */
export function makeDocument(overrides: Partial<DocumentDto> = {}): DocumentDto {
  const codeText: string = overrides.codeText ?? 'H.1.2.1';
  return {
    id: 1,
    codeText,
    code: codeText.replace(/^[A-Za-z]+\./, ''),
    title: 'ביצוע תקציב המדינה',
    type: 'Instruction',
    description: null,
    keywords: ['תקציב', 'חריגה'],
    version: 4,
    validFrom: '2026-05-06',
    validTo: null,
    isInForce: true,
    chapterCode: '1.2',
    chapterTitle: 'טיפול בתקציב',
    mainChapterCode: '1',
    mainChapterTitle: 'ביצוע תקציב',
    officialPageUrl: `https://takam.mof.gov.il/document/${codeText}`,
    ...overrides,
  };
}

/** Two chapters with their sub-chapters. */
export const CHAPTERS: ChapterDto[] = [
  { code: '1', title: 'ביצוע תקציב', parentCode: null, documentCount: 4 },
  { code: '1.2', title: 'טיפול בתקציב', parentCode: '1', documentCount: 1 },
  { code: '1.4', title: 'ביצוע תשלומים בגין התחייבויות', parentCode: '1', documentCount: 2 },
  { code: '1.6', title: 'אמצעי תשלום', parentCode: '1', documentCount: 1 },
  { code: '2', title: 'חשבונאות ממשלתית', parentCode: null, documentCount: 1 },
  { code: '2.1', title: 'כללי', parentCode: '2', documentCount: 1 },
];

/** A small set of documents, in the order the server would give them. */
export const DOCUMENTS = {
  budget: makeDocument({ id: 1, codeText: 'H.1.2.1', title: 'ביצוע תקציב המדינה' }),
  payments: makeDocument({ id: 2, codeText: 'H.1.4.3', title: 'מועדי תשלום', chapterCode: '1.4', chapterTitle: 'ביצוע תשלומים בגין התחייבויות', keywords: ['תשלום'], description: 'מתי משלמים לספק' }),
  foreign: makeDocument({ id: 3, codeText: 'H.1.6.4', title: 'תשלומים במטבע חוץ', chapterCode: '1.6', chapterTitle: 'אמצעי תשלום', keywords: [], isInForce: false, validTo: '2025-12-31' }),
  form: makeDocument({ id: 4, codeText: 'T.1.4.1', title: 'טופס בקשה לתשלום', type: 'Form', chapterCode: '1.4', chapterTitle: 'ביצוע תשלומים בגין התחייבויות', keywords: [] }),
  accounting: makeDocument({ id: 5, codeText: 'H.2.1.1', title: 'חשבונאות ממשלתית כללי', chapterCode: '2.1', chapterTitle: 'כללי', mainChapterCode: '2', mainChapterTitle: 'חשבונאות ממשלתית', keywords: [] }),
};
