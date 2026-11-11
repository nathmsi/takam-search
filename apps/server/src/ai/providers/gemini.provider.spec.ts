import { GeminiProvider } from './gemini.provider';

const vector = (): number[] => Array.from({ length: 768 }, () => 0.5);
const answer = (body: object, status = 200): Response => new Response(JSON.stringify(body), { status });

describe('GeminiProvider', () => {
  const key = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
  });

  afterEach(() => {
    if (key === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = key;
    jest.restoreAllMocks();
  });

  it('is configured only when the key is set', () => {
    expect(new GeminiProvider().isConfigured()).toBe(true);
    delete process.env.GEMINI_API_KEY;
    expect(new GeminiProvider().isConfigured()).toBe(false);
  });

  it('asks for a document or a query embedding of 768 numbers, with the key in a header and not in the address', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(answer({ embeddings: [{ values: vector() }, { values: vector() }] }));

    const vectors = await new GeminiProvider().embed({ texts: ['א', 'ב'], task: 'document' });

    expect(vectors).toHaveLength(2);
    const [address, options] = fetchSpy.mock.calls[0];
    expect(String(address)).not.toContain('test-key');
    expect(((options as RequestInit).headers as Record<string, string>)['x-goog-api-key']).toBe('test-key');
    expect(JSON.parse((options as RequestInit).body as string).requests[1]).toMatchObject({ taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: 768, content: { parts: [{ text: 'ב' }] } });
  });

  it('asks again after a 503 and then gives the vector', async () => {
    jest.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void) => callback()) as unknown as typeof setTimeout);
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(answer({}, 503)).mockResolvedValueOnce(answer({ embeddings: [{ values: vector() }] }));

    expect(await new GeminiProvider().embed({ texts: ['א'], task: 'query' })).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('fails at once on an error that waiting will not fix (a wrong key)', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('bad key', { status: 403 }));

    await expect(new GeminiProvider().embed({ texts: ['א'], task: 'query' })).rejects.toThrow('Gemini answered 403');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('refuses vectors of the wrong size', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(answer({ embeddings: [{ values: [1, 2, 3] }] }));

    await expect(new GeminiProvider().embed({ texts: ['א'], task: 'query' })).rejects.toThrow('did not give 1 vectors of 768');
  });
});
