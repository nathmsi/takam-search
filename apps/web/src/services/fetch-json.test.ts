import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api-error';
import { fetchJson } from './fetch-json';

function stubFetch(response: Response | Error): void {
  vi.stubGlobal('fetch', vi.fn(async () => (response instanceof Error ? Promise.reject(response) : response)));
}

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('fetchJson', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('gives the body of a JSON answer', async () => {
    stubFetch(json({ total: 3 }));

    await expect(fetchJson<{ total: number }>('/v1/documents')).resolves.toEqual({ total: 3 });
  });

  it('turns a refusal into an ApiError with the status and the body of the API', async () => {
    stubFetch(json({ statusCode: 404, error: 'Not Found', message: 'No instruction 9.9.9', path: '/x', timestamp: 't' }, 404));

    const error = await fetchJson('/v1/documents/9.9.9').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: 'No instruction 9.9.9' });
  });

  it('refuses an answer that is not JSON, even with a 200 (a proxy page, a wrong address)', async () => {
    stubFetch(new Response('<html>home</html>', { status: 200, headers: { 'content-type': 'text/html' } }));

    await expect(fetchJson('/v1/documents')).rejects.toMatchObject({ status: 200, message: expect.stringContaining('not JSON') });
  });

  it('says status 0 when the server cannot be reached', async () => {
    stubFetch(new TypeError('Failed to fetch'));

    await expect(fetchJson('/v1/documents')).rejects.toMatchObject({ status: 0 });
  });

  it('lets an abort through as it is, so a cancelled search is not shown as an error', async () => {
    stubFetch(new DOMException('aborted', 'AbortError'));

    await expect(fetchJson('/v1/documents')).rejects.toMatchObject({ name: 'AbortError' });
  });
});
