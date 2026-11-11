/**
 * `node docs/overview/build.mjs`: makes `architecture.png` from `architecture.svg`, then `takam-search.pdf` from
 * `takam-search.he.html` (which shows the picture). Uses the Chromium that Playwright installed for the end-to-end tests
 * (`pnpm --filter @takam/web exec playwright install chromium`).
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(join(HERE, '..', '..', 'apps', 'web', 'package.json'))('playwright-core');

const browser = await chromium.launch();
try {
  const picture = await browser.newPage({ viewport: { width: 1800, height: 1040 }, deviceScaleFactor: 2 });
  await picture.setContent(`<body style="margin:0">${readFileSync(join(HERE, 'architecture.svg'), 'utf8')}</body>`);
  await picture.screenshot({ path: join(HERE, 'architecture.png') });
  console.log('architecture.png');

  const page = await browser.newPage();
  await page.goto(pathToFileURL(join(HERE, 'takam-search.he.html')).href);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: join(HERE, 'takam-search.pdf'), format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '15mm', right: '15mm' } });
  console.log('takam-search.pdf');
} finally {
  await browser.close();
}
