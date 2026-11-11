import { ServiceUnavailableException } from '@nestjs/common';
import { TakamSiteClient } from './takam-site.client';

const answer = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status });
const version = (changes: object) => ({ rtn_status__c: 'Published', rtn_archived__c: false, rtn_versionnumber__c: 1, rtn_contentversionid__c: '0683X00000vtGzqQAE', ...changes });

describe('TakamSiteClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('asks the site for the versions of the document, with a user agent (the site refuses requests without one)', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(answer([version({})]));

    expect(await new TakamSiteClient().findFileId('a0h3X00003hMm89QAC')).toBe('0683X00000vtGzqQAE');

    const [address, options] = fetchSpy.mock.calls[0];
    expect(String(address)).toMatch(/\/DocumentVersion\/a0h3X00003hMm89QAC$/);
    expect(((options as RequestInit).headers as Record<string, string>)['user-agent']).toBeTruthy();
  });

  it('takes the file of the last published version, never an archived or a draft one', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      answer([
        version({ rtn_versionnumber__c: 3, rtn_contentversionid__c: 'draftdraftdraft1', rtn_status__c: 'Draft' }),
        version({ rtn_versionnumber__c: 2, rtn_contentversionid__c: 'archivedarchived', rtn_archived__c: true }),
        version({ rtn_versionnumber__c: 1, rtn_contentversionid__c: 'publishedpublish' }),
        version({ rtn_versionnumber__c: 0, rtn_contentversionid__c: 'olderolderolderol' }),
      ]),
    );

    expect(await new TakamSiteClient().findFileId('x')).toBe('publishedpublish');
  });

  it('gives null when the site has no file for the document', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(answer([]));

    expect(await new TakamSiteClient().findFileId('x')).toBeNull();
  });

  it('says 503 when the site fails or cannot be reached', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(answer({}, 500)).mockRejectedValueOnce(new Error('offline'));

    await expect(new TakamSiteClient().findFileId('x')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(new TakamSiteClient().findFileId('x')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
