import { NotFoundException } from '@nestjs/common';
import { createTestDatabase } from '../../test/support/create-test-database';
import type { DatabaseService } from '../database/database.service';
import { DocumentsRepository } from './documents.repository';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  let database: DatabaseService;
  let service: DocumentsService;

  beforeAll(async () => {
    database = await createTestDatabase();
    service = new DocumentsService(new DocumentsRepository(database));
  }, 60_000);

  afterAll(async () => {
    await database.onModuleDestroy();
  });

  it('gives 50 documents by default, and says how many there are', async () => {
    const page = await service.list({});

    expect(page.items).toHaveLength(50);
    expect(page.total).toBe(922);
    expect(page.relaxed).toBe(false);
  });

  it('gives the documents that have every word, as they are', async () => {
    const page = await service.list({ q: 'תשלום מקדמות' });

    expect(page.relaxed).toBe(false);
    expect(page.items.map((item) => item.codeText)).toContain('H.1.4.5');
  });

  it('gives the closest documents, and says so, when none has every word', async () => {
    const page = await service.list({ q: 'האם אפשר לשלם מקדמה' });

    expect(page.relaxed).toBe(true);
    expect(page.items.map((item) => item.codeText)).toContain('H.1.4.5');
  });

  it('gives nothing, and does not say "closest", when no word is anywhere', async () => {
    expect(await service.list({ q: 'zzzzzzzz' })).toEqual({ items: [], total: 0, relaxed: false });
  });

  it('passes the filters on', async () => {
    const page = await service.list({ type: 'Instruction', chapter: '1.10', limit: 10 });

    expect(page.items.map((item) => item.codeText)).toEqual(['H.1.10.1', 'H.1.10.2']);
  });

  it('gives one document by its number', async () => {
    expect((await service.get('H.1.2.1')).title).toBe('ביצוע תקציב המדינה');
  });

  it('refuses a number that does not exist with a 404', async () => {
    await expect(service.get('H.99.9.9')).rejects.toThrow(NotFoundException);
  });
});
