/**
 * `pnpm db:query "SELECT ..."`: runs a SQL query on a fresh copy of the database (built from the saved answers of the site in `test/fixtures`, in memory) and prints
 * the rows as a table. It never touches the database of a running server. Handy to look at the tables and to try a search:
 *   pnpm db:query "SELECT code_text, title FROM documents WHERE has_term(title_n, 'קופ') LIMIT 5"
 *   pnpm db:query "SELECT search_terms('קופות ביטחון'), normalize_he('דו\"ח השוואה')"
 */
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadData } from '../src/database/load-data';
import { readSiteDataFiles } from '../src/database/read-site-data-files';

async function main(): Promise<void> {
  const sql: string | undefined = process.argv[2];
  if (sql === undefined) throw new Error('Give a query: pnpm db:query "SELECT * FROM chapters LIMIT 5"');
  const database = await PGlite.create({ extensions: { vector } });
  await database.exec(readFileSync(join(__dirname, '..', 'src', 'database', 'schema.sql'), 'utf8'));
  await loadData(database, readSiteDataFiles(join(__dirname, '..', 'test', 'fixtures')));
  const { rows } = await database.query(sql);
  console.table(rows);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
