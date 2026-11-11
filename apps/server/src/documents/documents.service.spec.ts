import { NotFoundException } from '@nestjs/common';
import { createTestDatabase } from '../../test/support/create-test-database';
import type { DatabaseService } from '../database/database.service';
import { DocumentsRepository } from './documents.repository';
import type { AiService } from '../ai/ai.service';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  let database: DatabaseService;
  let service: DocumentsService;
  const ai = { embedQuestion: jest.fn() } as unknown as AiService & { embedQuestion: jest.Mock };

  beforeAll(async () => {
    database = await createTestDatabase();
    service = new DocumentsService(new DocumentsRepository(database), ai);
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

  it('does not call Gemini unless the search by meaning is asked', async () => {
    const page = await service.list({ q: 'מקדמות' });

    expect(ai.embedQuestion).not.toHaveBeenCalled();
    expect(page.meaning).toBe(false);
  });

  it('asks Gemini for the question and searches by meaning when `meaning=yes`', async () => {
    ai.embedQuestion.mockResolvedValue(Array.from({ length: 768 }, (_, position) => (position === 0 ? 1 : 0)));
    await database.query("UPDATE documents SET embedding = $1::vector WHERE code_text = 'H.1.4.5'", [`[${[1, ...Array(767).fill(0)].join(',')}]`]);

    const page = await service.list({ q: 'מישהו לא שילם בזמן', meaning: 'yes' });

    expect(ai.embedQuestion).toHaveBeenCalledWith('מישהו לא שילם בזמן');
    expect(page).toMatchObject({ meaning: true, relaxed: false });
    expect(page.items.map((item) => item.codeText)).toEqual(['H.1.4.5']);
  });

  it('does not search by meaning without words', async () => {
    ai.embedQuestion.mockClear();

    const page = await service.list({ meaning: 'yes' });

    expect(ai.embedQuestion).not.toHaveBeenCalled();
    expect(page.meaning).toBe(false);
  });

  it('gives the closest documents, and says so, when none has every word', async () => {
    const page = await service.list({ q: 'האם אפשר לשלם מקדמה' });

    expect(page.relaxed).toBe(true);
    expect(page.items.map((item) => item.codeText)).toContain('H.1.4.5');
  });

  it('gives nothing, and does not say "closest", when no word is anywhere', async () => {
    expect(await service.list({ q: 'zzzzzzzz' })).toEqual({ items: [], total: 0, relaxed: false, meaning: false });
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
