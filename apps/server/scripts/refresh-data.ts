/**
 * `pnpm data:refresh`: reads the documents and the chapters again from the Takam site and replaces the two files of `data/`.
 * Nothing is replaced when the site's answer looks wrong (see `checkSiteData`) or when the database cannot be built from it.
 * The files are the answers exactly as the site gives them, so `git diff` shows something only when the site changed.
 * The running server keeps what it loaded: restart it (and `pnpm db:reset`) or redeploy it to see the new data.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkSiteData } from '../src/database/check-site-data';
import { loadData } from '../src/database/load-data';

const SITE_API: string = process.env.TAKAM_API_URL ?? 'https://takam.mof.gov.il/api';
const DATA_DIRECTORY: string = join(__dirname, '..', 'data');

async function download(name: string): Promise<string> {
  const response: Response = await fetch(`${SITE_API}/${name}`, { headers: { 'user-agent': 'takam-search-data-refresh' }, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${SITE_API}/${name} answered ${response.status}`);
  return response.text();
}

async function countRows(): Promise<{ documents: number; chapters: number }> {
  const database = await PGlite.create();
  await database.exec(readFileSync(join(__dirname, '..', 'src', 'database', 'schema.sql'), 'utf8'));
  await loadData(database);
  const [{ documents, chapters }] = (await database.query<{ documents: number; chapters: number }>(
    'SELECT (SELECT count(*)::int FROM documents) AS documents, (SELECT count(*)::int FROM chapters) AS chapters',
  )).rows;
  await database.close();
  return { documents, chapters };
}

async function main(): Promise<void> {
  const [documentText, chapterText] = await Promise.all([download('Document'), download('Chapter')]);
  const problems: string[] = checkSiteData({ documents: JSON.parse(documentText), chapters: JSON.parse(chapterText) });
  if (problems.length > 0) throw new Error(`The site's data was not kept: ${problems.join('; ')}`);

  const files: Record<string, string> = { 'Document.json': documentText, 'Chapter.json': chapterText };
  const before: Record<string, string> = Object.fromEntries(Object.keys(files).map((file) => [file, readFileSync(join(DATA_DIRECTORY, file), 'utf8')]));
  const changed: string[] = Object.keys(files).filter((file) => files[file] !== before[file]);
  if (changed.length === 0) return void console.log('The site has not changed: nothing to update.');

  for (const file of changed) writeFileSync(join(DATA_DIRECTORY, file), files[file]);
  try {
    const rows = await countRows();
    console.log(`Updated ${changed.join(', ')}: the database now builds with ${rows.documents} documents and ${rows.chapters} chapters.`);
  } catch (error) {
    for (const file of changed) writeFileSync(join(DATA_DIRECTORY, file), before[file]);
    throw new Error(`The new data could not be loaded, the old files are back: ${error instanceof Error ? error.message : error}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
