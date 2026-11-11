import type { DocumentDto } from '@takam/contracts';
import { createTestDatabase } from '../../test/support/create-test-database';
import type { DatabaseService } from '../database/database.service';
import { DocumentsRepository } from './documents.repository';
import type { SearchPage, SearchRequest } from './documents.repository';

/** The search SQL, on the real data. */
describe('DocumentsRepository', () => {
  let database: DatabaseService;
  let repository: DocumentsRepository;
  const nothingAsked: SearchRequest = { today: '2026-11-11', words: '', mode: 'all', chapter: null, type: null, inForce: 'all', limit: 1000, offset: 0 };

  const search = (changes: Partial<SearchRequest>): Promise<SearchPage> => repository.search({ ...nothingAsked, ...changes });
  const codesOf = (page: SearchPage): string[] => page.items.map((item) => item.codeText);

  beforeAll(async () => {
    database = await createTestDatabase();
    repository = new DocumentsRepository(database);
  }, 60_000);

  afterAll(async () => {
    await database.onModuleDestroy();
  });

  describe('without words', () => {
    it('gives every document, in the order of the numbers (1.2 before 1.10)', async () => {
      const page = await search({ type: 'Instruction' });

      expect(page.total).toBe(418);
      expect(codesOf(page).slice(0, 4)).toEqual(['H.1.1.0', 'H.1.1.1', 'H.1.1.2', 'H.1.2.1']);
      expect(codesOf(page).indexOf('H.1.9.1')).toBeLessThan(codesOf(page).indexOf('H.1.10.1'));
    });

    it('cuts a page and still counts all the documents', async () => {
      const page = await search({ type: 'Instruction', limit: 5, offset: 5 });

      expect(page.items).toHaveLength(5);
      expect(page.total).toBe(418);
    });
  });

  describe('with words', () => {
    it('finds a document by its number, with or without the letter', async () => {
      expect(codesOf(await search({ words: 'H.1.4.3' }))).toContain('H.1.4.3');
      expect((await search({ words: '1.4.3' })).items[0].codeText).toBe('H.1.4.3');
    });

    it('finds H.7.1.5, merged into 7.1.1, which the Takam site leaves out of its tree (no chapter in the fields it displays)', async () => {
      expect(codesOf(await search({ words: 'H.7.1.5' }))).toEqual(['H.7.1.5']);
    });

    it.each([
      ['קופת ביטחון', 'קופות ביטחון'],
      ['התחייבות', 'התחייבויות'],
      ['מקדמה', 'מקדמות'],
      ['תשלום מקדמה', 'תשלום מקדמות'],
    ])('gives the same documents for %s and %s (the site gives different ones)', async (singular, plural) => {
      const one = codesOf(await search({ words: singular }));
      const other = codesOf(await search({ words: plural }));

      expect(one.length).toBeGreaterThan(0);
      expect(one).toEqual(other);
    });

    it('finds the cash-box instructions with the word in either form', async () => {
      expect(codesOf(await search({ words: 'קופת ביטחון' }))).toEqual(expect.arrayContaining(['H.1.10.1', 'H.1.10.2']));
    });

    it('needs every word in "all" mode, and only one in "any" mode', async () => {
      const all = await search({ words: 'מקדמות עיקול' });
      const any = await search({ words: 'מקדמות עיקול', mode: 'any' });

      expect(all.total).toBeLessThan(any.total);
      expect(codesOf(any)).toEqual(expect.arrayContaining(['H.1.4.5', 'H.1.6.6']));
    });

    it('ignores the little words of a question', async () => {
      const question = await search({ words: 'האם אפשר לשלם מקדמה', mode: 'any' });

      expect(codesOf(question)).toContain('H.1.4.5');
    });

    it('puts a title match before a description match', async () => {
      const page = await search({ words: 'ועדת הפטור' });

      expect(codesOf(page).slice(0, 3)).toEqual(expect.arrayContaining(['H.7.1.5']));
    });

    it('finds nothing for words that are nowhere', async () => {
      expect((await search({ words: 'zzzzzzzz' })).total).toBe(0);
    });

    it('is not fooled by a quote or a SQL command in the words', async () => {
      const before = (await search({})).total;

      const page = await search({ words: `'; DROP TABLE documents; --` });

      expect(page.total).toBe(0);
      expect((await search({})).total).toBe(before);
    });
  });

  describe('filters', () => {
    it('keeps the documents of a chapter, of a sub-chapter', async () => {
      const chapter = await search({ chapter: '1' });
      const subChapter = await search({ chapter: '1.4' });

      expect(chapter.items.every((item) => item.mainChapterCode === '1')).toBe(true);
      expect(subChapter.items.every((item) => item.chapterCode === '1.4')).toBe(true);
      expect(subChapter.total).toBeLessThan(chapter.total);
    });

    it('keeps one kind of document', async () => {
      const forms = await search({ type: 'Form' });

      expect(forms.total).toBe(243);
      expect(forms.items.every((item) => item.type === 'Form')).toBe(true);
    });

    it('tells what is in force from the dates, against the date it is given', async () => {
      const yes = await search({ inForce: 'yes' });
      const no = await search({ inForce: 'no' });

      expect(yes.total + no.total).toBe((await search({})).total);
      expect(yes.items.every((item) => item.isInForce && (item.validTo === null || item.validTo >= '2026-11-11'))).toBe(true);
      expect(no.items.every((item) => !item.isInForce)).toBe(true);
      expect(no.total).toBeGreaterThan(0);
    });

    it('moves with the date: a temporary instruction valid from 2018-07-29 to 2018-12-31', async () => {
      const during = await repository.findByCodeText('2018-08-01', 'HZ.11.4.2.1');
      const before = await repository.findByCodeText('2018-06-01', 'HZ.11.4.2.1');
      const after = await repository.findByCodeText('2019-06-01', 'HZ.11.4.2.1');

      expect([during?.isInForce, before?.isInForce, after?.isInForce]).toEqual([true, false, false]);
    });

    it('combines the filters with the words', async () => {
      const page = await search({ words: 'תשלום', chapter: '1.4', type: 'Instruction' });

      expect(page.total).toBeGreaterThan(0);
      expect(page.items.every((item) => item.chapterCode === '1.4' && item.type === 'Instruction')).toBe(true);
    });
  });

  describe('findByCodeText', () => {
    it('gives a document with its chapters, its keywords as a list and the address of its page', async () => {
      const document = (await repository.findByCodeText('2026-11-11', 'H.1.2.1')) as DocumentDto;

      expect(document).toMatchObject({
        codeText: 'H.1.2.1',
        code: '1.2.1',
        title: 'ביצוע תקציב המדינה',
        type: 'Instruction',
        version: 4,
        validFrom: '2026-05-06',
        validTo: null,
        isInForce: true,
        chapterCode: '1.2',
        chapterTitle: 'טיפול בתקציב',
        mainChapterCode: '1',
        mainChapterTitle: 'ביצוע תקציב',
        officialPageUrl: 'https://takam.mof.gov.il/document/H.1.2.1',
      });
      expect(document.keywords).toContain('חריגה מהתקציב');
    });

    it('gives nothing for a number that does not exist', async () => {
      expect(await repository.findByCodeText('2026-11-11', 'H.99.9.9')).toBeUndefined();
    });
  });
});
