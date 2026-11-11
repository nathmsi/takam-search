/**
 * `API_URL=... WEB_URL=... node scripts/smoke-test.mjs`: the checks made on the LIVE site right after a deploy.
 * They read the real production data, so they check what matters (the search answers, the data is loaded, the AI key and the
 * link to the Takam site work, the web app is served and may call the API), not exact counts that change when the site changes.
 * The API is asked again for up to 90 seconds: the first request after a deploy starts the server and builds its database.
 */
import assert from 'node:assert/strict';

const API = (process.env.API_URL ?? '').replace(/\/$/, '');
const WEB = (process.env.WEB_URL ?? '').replace(/\/$/, '');
if (!API || !WEB) throw new Error('Set API_URL and WEB_URL');

const SLEEP = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const get = async (path, options = {}) => fetch(`${API}${path}`, { signal: AbortSignal.timeout(30_000), ...options });
const json = async (path) => {
  const response = await get(path);
  assert.equal(response.status, 200, `${path} answered ${response.status}`);
  return response.json();
};
const codesOf = (list) => list.items.map((item) => item.codeText);

async function waitForApi() {
  for (let attempt = 1; attempt <= 18; attempt++) {
    try {
      const response = await get('/health');
      if (response.status === 200) return response.json();
    } catch {
      // the server is starting
    }
    await SLEEP(5000);
  }
  throw new Error(`${API}/health did not answer in 90 seconds`);
}

const checks = [
  ['the API is up and its database is loaded', async () => {
    const health = await waitForApi();
    assert.equal(health.status, 'ok');
    assert.ok(health.database.documents >= 900, `only ${health.database.documents} documents`);
    assert.ok(health.database.chapters >= 100, `only ${health.database.chapters} chapters`);
  }],
  ['a search by words finds the cash-box instructions', async () => {
    assert.ok(codesOf(await json(`/v1/documents?q=${encodeURIComponent('קופות ביטחון')}&limit=50`)).includes('H.1.10.1'));
  }],
  ['singular and plural give the same documents', async () => {
    const one = codesOf(await json(`/v1/documents?q=${encodeURIComponent('קופת ביטחון')}&limit=50`));
    const other = codesOf(await json(`/v1/documents?q=${encodeURIComponent('קופות ביטחון')}&limit=50`));
    assert.deepEqual(one, other);
  }],
  ['H.7.1.5, which the site hides from its tree, is found', async () => {
    assert.deepEqual(codesOf(await json('/v1/documents?q=H.7.1.5')), ['H.7.1.5']);
  }],
  ['a question gets the closest documents, and says so', async () => {
    const list = await json(`/v1/documents?q=${encodeURIComponent('האם אפשר לשלם מקדמה עיקול')}&limit=50`);
    assert.equal(list.relaxed, true);
    assert.ok(list.items.length > 0);
  }],
  ['the search by meaning answers: by meaning, or by words when the AI is down (never an error)', async () => {
    const list = await json(`/v1/documents?q=${encodeURIComponent('ספק לא קיבל תשלום בזמן')}&meaning=yes&limit=20`);
    assert.ok(list.meaning === true || list.meaningUnavailable === true, 'neither by meaning nor the fallback');
    assert.ok(list.items.length > 0);
    if (list.meaningUnavailable) console.warn('  warning: the AI did not answer (key missing or quota spent): the fallback on the words was used');
  }],
  ['nothing found is a 200 with an empty list', async () => {
    const list = await json('/v1/documents?q=zzzzzzzz');
    assert.deepEqual([list.total, list.items.length], [0, 0]);
  }],
  ['an instruction has its attached messages', async () => {
    const document = await json('/v1/documents/H.1.2.2');
    assert.ok(document.related.length >= 5, `${document.related.length} attached documents`);
  }],
  ['the file link sends to the download of the Takam site (302)', async () => {
    const response = await get('/v1/documents/H.1.2.2/file', { redirect: 'manual' });
    assert.equal(response.status, 302);
    assert.match(response.headers.get('location') ?? '', /^https:\/\/takam\.mof\.gov\.il\/api\/DocumentSF\/DownloadDocument\/[A-Za-z0-9]{15,18}\/x$/);
  }],
  ['an unknown document is a 404 in JSON', async () => {
    const response = await get('/v1/documents/H.99.9.9');
    assert.equal(response.status, 404);
    assert.equal((await response.json()).statusCode, 404);
  }],
  ['the web app may call the API (CORS)', async () => {
    const response = await get('/v1/chapters', { headers: { Origin: WEB } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), WEB);
  }],
  ['the web app is served, and a deep link opens it too', async () => {
    for (const path of ['/', '/documents/H.1.2.1']) {
      const response = await fetch(`${WEB}${path}`, { signal: AbortSignal.timeout(30_000) });
      assert.equal(response.status, 200, `${path} answered ${response.status}`);
      assert.match(await response.text(), /<div id="root">/);
    }
  }],
];

let failed = 0;
for (const [name, check] of checks) {
  try {
    await check();
    console.log(`  ok    ${name}`);
  } catch (error) {
    failed++;
    console.log(`  FAIL  ${name}\n        ${error instanceof Error ? error.message : error}`);
  }
}
console.log(failed === 0 ? `\nAll ${checks.length} checks passed on ${WEB}` : `\n${failed} of ${checks.length} checks FAILED`);
process.exitCode = failed === 0 ? 0 : 1;
