import { createTestDatabase } from '../../test/support/create-test-database';
import type { DatabaseService } from './database.service';

/** Tests of the data itself: what the loader made of the two files of `data/`. */
describe('the data loaded in the database', () => {
  let database: DatabaseService;

  async function one<Row>(sql: string): Promise<Row> {
    const [row] = await database.query<Row>(sql);
    return row;
  }

  beforeAll(async () => {
    database = await createTestDatabase();
  }, 60_000);

  afterAll(async () => {
    await database.onModuleDestroy();
  });

  it('holds the 922 documents that have a number (the 204 attached files are left out) and 16 chapters', async () => {
    expect(await one('SELECT count(*)::int AS n FROM documents')).toEqual({ n: 922 });
    expect(await one('SELECT count(*)::int AS n FROM chapters WHERE parent_code IS NULL')).toEqual({ n: 16 });
  });

  it('gives every instruction a sub-chapter, the 11 that the site does not show in its tree included', async () => {
    expect(await one(`SELECT count(*)::int AS n FROM documents WHERE type = 'Instruction' AND chapter_code IS NULL`)).toEqual({ n: 0 });
    expect(await one(`SELECT chapter_code AS code FROM documents WHERE code_text = 'H.7.1.5'`)).toEqual({ code: '7.1' });
  });

  it('recreates chapter 10, which the site lists nowhere, from its documents', async () => {
    expect(await one(`SELECT title, parent_code AS "parentCode" FROM chapters WHERE code = '10'`)).toEqual({ title: 'ניהול מלאי ומצאי', parentCode: null });
    expect(await one(`SELECT chapter_code AS code FROM documents WHERE code_text = 'H.10.2.1'`)).toEqual({ code: '10.2' });
  });

  it('puts a form or a message in the chapter of the instruction it belongs to', async () => {
    const row = await one<{ parentChapter: string; childChapter: string }>(
      `SELECT p.chapter_code AS "parentChapter", c.chapter_code AS "childChapter"
       FROM documents c JOIN documents p ON p.id = c.parent_id
       WHERE p.code_text = 'H.7.1.4' AND c.type = 'Form' LIMIT 1`,
    );
    expect(row.childChapter).toBe(row.parentChapter);
  });

  it('writes the number twice: as the site does (H.1.2.1) and as a plain number (1.2.1)', async () => {
    expect(await one(`SELECT code FROM documents WHERE code_text = 'H.1.2.1'`)).toEqual({ code: '1.2.1' });
    expect(await one(`SELECT code FROM documents WHERE code_text = 'HZ.1.3.3.1'`)).toEqual({ code: '1.3.3.1' });
  });

  it('keeps the dates as dates and leaves an empty end date empty', async () => {
    expect(await one(`SELECT valid_from::text AS "from", valid_to AS "to" FROM documents WHERE code_text = 'H.1.2.1'`)).toEqual({ from: '2026-05-06', to: null });
  });
});
