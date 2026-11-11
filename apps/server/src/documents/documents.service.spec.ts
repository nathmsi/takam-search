import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createTestDatabase } from '../../test/support/create-test-database';
import type { DatabaseService } from '../database/database.service';
import { DocumentsRepository } from './documents.repository';
import type { AiService } from '../ai/ai.service';
import { DocumentsService } from './documents.service';
import type { TakamSiteClient } from './takam-site.client';

describe('DocumentsService', () => {
  let database: DatabaseService;
  let service: DocumentsService;
  const site = { findFileId: jest.fn() } as unknown as TakamSiteClient & { findFileId: jest.Mock };
  const ai = { embedQuestion: jest.fn() } as unknown as AiService & { embedQuestion: jest.Mock };

  beforeAll(async () => {
    database = await createTestDatabase();
    service = new DocumentsService(new DocumentsRepository(database), ai, site);
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

    const page = await service.list({ q: 'qqqq zzzz', meaning: 'yes' });

    expect(ai.embedQuestion).toHaveBeenCalledWith('qqqq zzzz');
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
    expect(await service.list({ q: 'zzzzzzzz' })).toEqual({ items: [], total: 0, relaxed: false, meaning: false, meaningUnavailable: false });
  });

  describe('when the AI cannot answer', () => {
    it('falls back on the search by words, and says so, instead of failing', async () => {
      ai.embedQuestion.mockRejectedValueOnce(new ServiceUnavailableException('quota'));

      const page = await service.list({ q: 'תשלום מקדמות', meaning: 'yes' });

      expect(page).toMatchObject({ meaning: false, meaningUnavailable: true, relaxed: false });
      expect(page.items.map((item) => item.codeText)).toContain('H.1.4.5');
    });

    it('keeps the "closest documents" rule in the fallback', async () => {
      ai.embedQuestion.mockRejectedValueOnce(new ServiceUnavailableException('quota'));

      const page = await service.list({ q: 'האם אפשר לשלם מקדמה', meaning: 'yes' });

      expect(page).toMatchObject({ meaning: false, meaningUnavailable: true, relaxed: true });
    });

    it('does not hide a real bug', async () => {
      ai.embedQuestion.mockRejectedValueOnce(new Error('boom'));

      await expect(service.list({ q: 'מקדמות', meaning: 'yes' })).rejects.toThrow('boom');
    });
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

  describe('fileAddress', () => {
    it('gives the download address of the site for the file of the document, asking the site with the id of the document', async () => {
      site.findFileId.mockResolvedValue('0683X00000vtGzqQAE');

      const address = await service.fileAddress('H.7.13.3');

      expect(address).toBe('https://takam.mof.gov.il/api/DocumentSF/DownloadDocument/0683X00000vtGzqQAE/x');
      expect(site.findFileId).toHaveBeenCalledWith('a0h3X00003hMm89QAC');
    });

    it('says 404 for a number that does not exist, without asking the site', async () => {
      site.findFileId.mockClear();

      await expect(service.fileAddress('H.99.9.9')).rejects.toBeInstanceOf(NotFoundException);
      expect(site.findFileId).not.toHaveBeenCalled();
    });

    it('says 404 when the site has no file, and refuses an id that does not look like a file id', async () => {
      site.findFileId.mockResolvedValueOnce(null).mockResolvedValueOnce('../../evil');

      await expect(service.fileAddress('H.7.13.3')).rejects.toThrow('has no file');
      await expect(service.fileAddress('H.7.13.3')).rejects.toThrow('has no file');
    });
  });
});
