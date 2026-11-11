import type { INestApplication } from '@nestjs/common';
import type { DocumentDto, DocumentListDto } from '@takam/contracts';
import request from 'supertest';
import { DatabaseService } from '../src/database/database.service';
import { createTestApp } from './support/create-test-app';

describe('Documents (e2e)', () => {
  let app: INestApplication;
  const get = (path: string, query: object = {}) => request(app.getHttpServer()).get(path).query(query);

  beforeAll(async () => {
    app = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/documents gives 50 documents by default and the total', async () => {
    const { status, body } = await get('/v1/documents');

    const list = body as DocumentListDto;
    expect(status).toBe(200);
    expect(list.items).toHaveLength(50);
    expect(list).toMatchObject({ total: 922, relaxed: false });
  });

  it('GET /v1/documents?type=Instruction gives the 418 instructions in the order of the numbers', async () => {
    const { body } = await get('/v1/documents', { type: 'Instruction', limit: 1000 });

    const list = body as DocumentListDto;
    expect(list.total).toBe(418);
    expect(list.items.slice(0, 3).map((item) => item.codeText)).toEqual(['H.1.1.0', 'H.1.1.1', 'H.1.1.2']);
  });

  it('GET /v1/documents?q= finds words of the title and gives the same answer for the singular and the plural', async () => {
    const singular = (await get('/v1/documents', { q: 'קופת ביטחון' })).body as DocumentListDto;
    const plural = (await get('/v1/documents', { q: 'קופות ביטחון' })).body as DocumentListDto;

    expect(singular.items.map((item) => item.codeText)).toContain('H.1.10.1');
    expect(singular.items.map((item) => item.codeText)).toEqual(plural.items.map((item) => item.codeText));
  });

  it('GET /v1/documents?q= finds H.7.1.5, merged into 7.1.1, which the Takam site leaves out of its tree', async () => {
    const { body } = await get('/v1/documents', { q: 'H.7.1.5' });

    expect((body as DocumentListDto).items.map((item) => item.codeText)).toEqual(['H.7.1.5']);
  });

  it('GET /v1/documents?q= answers a question with the closest documents and says it did', async () => {
    const { body } = await get('/v1/documents', { q: 'האם אפשר לשלם מקדמה', type: 'Instruction' });

    const list = body as DocumentListDto;
    expect(list.relaxed).toBe(true);
    expect(list.items.map((item) => item.codeText)).toContain('H.1.4.5');
  });

  it('GET /v1/documents?q= gives an empty answer, not an error, for words that are nowhere', async () => {
    const { status, body } = await get('/v1/documents', { q: 'zzzzzzzz' });

    expect(status).toBe(200);
    expect(body).toEqual({ items: [], total: 0, relaxed: false, meaning: false });
  });

  it('GET /v1/documents?chapter=&type=&inForce= filters', async () => {
    const chapter = (await get('/v1/documents', { chapter: '1.10', type: 'Instruction' })).body as DocumentListDto;
    const expired = (await get('/v1/documents', { inForce: 'no', limit: 1000 })).body as DocumentListDto;

    expect(chapter.items.map((item) => item.codeText)).toEqual(['H.1.10.1', 'H.1.10.2']);
    expect(expired.total).toBeGreaterThan(0);
    expect(expired.items.every((item) => !item.isInForce)).toBe(true);
  });

  it('GET /v1/documents/:codeText gives one document', async () => {
    const { status, body } = await get('/v1/documents/H.1.2.1');

    expect(status).toBe(200);
    expect(body as DocumentDto).toMatchObject({ codeText: 'H.1.2.1', title: 'ביצוע תקציב המדינה', chapterCode: '1.2', mainChapterTitle: 'ביצוע תקציב' });
  });

  it('GET /v1/documents/:codeText answers 404 in JSON for a number that does not exist', async () => {
    const { status, body } = await get('/v1/documents/H.99.9.9');

    expect(status).toBe(404);
    expect(body).toMatchObject({ statusCode: 404, error: 'Not Found', path: '/v1/documents/H.99.9.9' });
  });

  it('GET /v1/documents/:codeText answers 400 for something that is not a document number', async () => {
    expect((await get('/v1/documents/abc')).status).toBe(400);
    expect((await get('/v1/documents/1.2.1')).status).toBe(400);
  });

  it.each([{ limit: 0 }, { limit: 5000 }, { offset: -1 }, { inForce: 'maybe' }, { chapter: 'abc' }, { type: 'Poem' }, { unknown: 'x' }])(
    'GET /v1/documents refuses the query %j with a 400',
    async (query) => {
      const { status, body } = await get('/v1/documents', query);

      expect(status).toBe(400);
      expect(body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    },
  );
});

describe('Documents by meaning (e2e)', () => {
  let app: INestApplication;
  const get = (query: object) => request(app.getHttpServer()).get('/v1/documents').query(query);
  const axis0 = (): Promise<number[]> => Promise.resolve([1, ...Array(767).fill(0)]);

  beforeAll(async () => {
    app = await createTestApp(axis0);
    await app.get(DatabaseService).query("UPDATE documents SET embedding = $1::vector WHERE code_text = 'H.1.4.5'", [`[${(await axis0()).join(',')}]`]);
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/documents?q=&meaning=yes gives the documents close in meaning, and says so', async () => {
    const { status, body } = await get({ q: 'qqqq zzzz', meaning: 'yes' });

    const list = body as DocumentListDto;
    expect(status).toBe(200);
    expect(list).toMatchObject({ meaning: true, total: 1 });
    expect(list.items[0].codeText).toBe('H.1.4.5');
  });

  it('refuses a value of meaning that is not yes or no', async () => {
    expect((await get({ q: 'x', meaning: 'maybe' })).status).toBe(400);
  });

  it('GET /v1/documents without meaning says meaning: false', async () => {
    expect(((await get({ q: 'מקדמות' })).body as DocumentListDto).meaning).toBe(false);
  });
});
