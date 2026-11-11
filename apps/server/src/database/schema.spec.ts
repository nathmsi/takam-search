import { createTestDatabase } from '../../test/support/create-test-database';
import type { DatabaseService } from './database.service';

describe('the SQL functions of schema.sql', () => {
  let database: DatabaseService;

  beforeAll(async () => {
    database = await createTestDatabase();
  }, 60_000);

  afterAll(async () => {
    await database.onModuleDestroy();
  });

  async function normalized(text: string): Promise<string> {
    const [row] = await database.query<{ value: string }>('SELECT normalize_he($1) AS value', [text]);
    return row.value;
  }

  describe('normalize_he', () => {
    it.each([
      ['קופת ביטחון', 'קופות ביטחון'],
      ['התחייבות', 'התחייבויות'],
      ['מקדמה', 'מקדמות'],
      ['מכרז', 'מכרזים'],
      ['חריגה', 'חריגות'],
      ['ועדה', 'ועדות'],
      ['הוראה זמנית', 'הוראות זמניות'],
      ['כתב שיפוי', 'כתבי שיפוי'],
      ['תקציב', 'התקציב'],
      ['תקציב', 'ובתקציב'],
    ])('writes %s and %s the same way', async (singular, plural) => {
      expect(await normalized(singular)).toBe(await normalized(plural));
    });

    it('writes דו"ח, דוח and the abbreviation תכ"ם however the quotes are typed', async () => {
      expect(await normalized('דו"ח')).toBe(await normalized('דוח'));
      expect(await normalized('תכ"ם')).toBe(await normalized("תכ''ם"));
      expect(await normalized('תכ"ם')).toBe(await normalized('תכ״ם'));
    });

    it('drops vowel points', async () => {
      expect(await normalized('תַּקְצִיב')).toBe('תקציב');
    });

    it('treats the first word like the others', async () => {
      expect(await normalized('התחייבות')).toBe((await normalized('x התחייבות')).replace('x ', ''));
    });

    it('keeps a number like 1.4.3 whole, and a code like H.1.4.3 as a letter and the number', async () => {
      expect(await normalized('1.4.3')).toBe('1.4.3');
      expect(await normalized('H.1.4.3')).toBe('h 1.4.3');
    });

    it('is empty for nothing', async () => {
      const [row] = await database.query<{ value: string | null }>('SELECT normalize_he(NULL) AS value');
      expect(row.value).toBe('');
    });
  });

  describe('search_terms', () => {
    async function termsOf(text: string): Promise<string[]> {
      const [row] = await database.query<{ terms: string[] }>('SELECT search_terms($1) AS terms', [text]);
      return row.terms;
    }

    it('drops the little words of a question and keeps the meaningful ones', async () => {
      expect(await termsOf('מה עושים כשיש חריגה')).toEqual(['חריג', 'עוש']);
      // `לשלם` keeps its ל on purpose: a prefix is only removed when four letters remain (it would spoil short roots).
      expect(await termsOf('האם אפשר לשלם מקדמה')).toEqual(['אפשר', 'לשלם', 'מקדמ']);
    });

    it('gives the same terms for the singular and the plural', async () => {
      expect(await termsOf('קופת ביטחון')).toEqual(await termsOf('קופות ביטחון'));
    });

    it('gives nothing for nothing', async () => {
      expect(await termsOf('')).toEqual([]);
      expect(await termsOf('   ')).toEqual([]);
    });
  });

  describe('has_term', () => {
    async function has(text: string, term: string): Promise<boolean> {
      const [row] = await database.query<{ found: boolean }>('SELECT has_term($1, $2) AS found', [text, term]);
      return row.found;
    }

    it('finds a term at the start of a word, not inside it (ועד is not in מועד)', async () => {
      expect(await has('ועד פטור', 'ועד')).toBe(true);
      expect(await has('מועד תשלום', 'ועד')).toBe(false);
    });

    it('finds a word that has a ו (and) in front', async () => {
      expect(await has('ביצוע ורכישות', 'רכיש')).toBe(true);
    });
  });

  describe('natural_key', () => {
    it('orders 1.2 before 1.10', async () => {
      const rows = await database.query<{ code: string }>(
        `SELECT code FROM (VALUES ('1.10.1'), ('1.2.1'), ('1.9.1'), ('2.1.1')) AS t(code) ORDER BY natural_key(code)`,
      );
      expect(rows.map((row) => row.code)).toEqual(['1.2.1', '1.9.1', '1.10.1', '2.1.1']);
    });

    it('is empty when it is not a number', async () => {
      const [row] = await database.query<{ key: number[] | null }>(`SELECT natural_key('abc') AS key`);
      expect(row.key).toBeNull();
    });
  });
});
