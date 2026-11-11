import type { ChapterDto, DocumentDto, DocumentListDto } from '@takam/contracts';
import { vi } from 'vitest';
import { CHAPTERS } from './fixtures';

interface FakeApiOptions {
  readonly documents: readonly DocumentDto[];
  readonly chapters?: readonly ChapterDto[];
  /** Answer every route with a 500. */
  readonly failing?: boolean;
}

/** What a test can read back: every address the app asked for, and a switch to make the server fail. */
interface FakeApi {
  readonly requests: string[];
  fail(failing: boolean): void;
}

/**
 * Replaces `fetch` with a small server of the API's routes (list with words, chapter, type and validity, one document, the
 * chapters), so the pages are tested end to end except for the network. The words work like the real ones in spirit:
 * every word must be in the title, the keywords or the description; if none has every word, any word will do (`relaxed`).
 */
export function installFakeApi({ documents, chapters = CHAPTERS, failing = false }: FakeApiOptions): FakeApi {
  const requests: string[] = [];
  let isFailing: boolean = failing;

  const reply = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = new URL(String(input), 'http://localhost');
      requests.push(url.pathname + url.search);
      if (isFailing) return reply({ statusCode: 500, error: 'Internal Server Error', message: 'Internal server error' }, 500);
      if (url.pathname === '/v1/chapters') return reply(chapters);
      if (url.pathname === '/v1/documents') return reply(listFor(documents, url.searchParams));
      const codeText: string | undefined = /^\/v1\/documents\/(.+)$/.exec(url.pathname)?.[1];
      const found: DocumentDto | undefined = documents.find((document) => document.codeText === decodeURIComponent(codeText ?? ''));
      return found ? reply(found) : reply({ statusCode: 404, error: 'Not Found', message: 'No such document' }, 404);
    }),
  );

  return { requests, fail: (value: boolean) => void (isFailing = value) };
}

function listFor(documents: readonly DocumentDto[], params: URLSearchParams): DocumentListDto {
  const chapter: string | null = params.get('chapter');
  const type: string | null = params.get('type');
  const inForce: string = params.get('inForce') ?? 'all';
  const words: string[] = (params.get('q') ?? '').split(' ').filter((word) => word !== '');
  const filtered: DocumentDto[] = documents.filter(
    (document) =>
      (chapter === null || document.chapterCode === chapter || document.mainChapterCode === chapter) &&
      (type === null || document.type === type) &&
      (inForce === 'all' || (inForce === 'yes') === document.isInForce),
  );
  const has = (document: DocumentDto, word: string): boolean => [document.title, document.description ?? '', ...document.keywords, document.codeText].some((text) => text.includes(word));
  const every: DocumentDto[] = filtered.filter((document) => words.every((word) => has(document, word)));
  if (every.length > 0 || words.length < 2) return { items: every, total: every.length, relaxed: false };
  const some: DocumentDto[] = filtered.filter((document) => words.some((word) => has(document, word)));
  return { items: some, total: some.length, relaxed: some.length > 0 };
}
