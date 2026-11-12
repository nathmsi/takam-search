import { fetchSiteData } from './fetch-site-data';

const documents = (count: number): object[] => Array.from({ length: count }, (_, index) => ({ documentcodetext: `H.1.${index}` }));
const chapters = (count: number): object[] => Array.from({ length: count }, (_, index) => ({ sfid: `c${index}` }));

/** The site, faked: what each of its two routes answers. */
function fakeSite(answers: Record<string, { status?: number; body: unknown }>): jest.SpyInstance {
  return jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const name: string = String(input).split('/').pop() as string;
    const { status = 200, body } = answers[name];
    return new Response(JSON.stringify(body), { status });
  });
}

describe('fetchSiteData', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reads the documents and the chapters of the site', async () => {
    const spy = fakeSite({ Document: { body: documents(950) }, Chapter: { body: chapters(120) } });

    const data = await fetchSiteData();

    expect(data.documents).toHaveLength(950);
    expect(data.chapters).toHaveLength(120);
    expect(spy.mock.calls.map(([address]) => String(address))).toEqual(expect.arrayContaining([expect.stringMatching(/\/Document$/), expect.stringMatching(/\/Chapter$/)]));
  });

  it('refuses a route that answers with an error', async () => {
    fakeSite({ Document: { status: 503, body: {} }, Chapter: { body: chapters(120) } });

    await expect(fetchSiteData()).rejects.toThrow('answered 503');
  });

  it('refuses an answer that looks wrong, so it can never replace data that works', async () => {
    fakeSite({ Document: { body: documents(3) }, Chapter: { body: chapters(120) } });

    await expect(fetchSiteData()).rejects.toThrow('was not kept');
  });
});
