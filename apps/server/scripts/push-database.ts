/**
 * `pnpm db:push`: reads the documents and the chapters from the Takam site (refused when its answer looks wrong), builds the
 * tables from `src/database/schema.sql` and fills them, in the remote database of `DATABASE_URL` (Supabase), in the schema `takam_poc`, which must exist and be usable by
 * the user of the address (which also needs USAGE on `extensions`, where `vector` lives). It touches nothing else of that project. The old tables are dropped and the new ones built in one
 * transaction: the API waits a few seconds, then sees the new data, never an empty or half filled database, and a failure
 * keeps the old data. The site is read first: if it fails nothing is touched. A document that is already in the database keeps its vector, even when its text changed (for now); a new
 * one has none until it is embedded, and the search by words still finds it. Run it again whenever the site has changed.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolClient } from 'pg';
import { createRemotePool } from '../src/database/create-remote-pool';
import { getSiteData } from '../src/database/get-site-data';
import { loadData } from '../src/database/load-data';
import { REMOTE_SCHEMA } from '../src/database/remote-schema';
import type { SiteData } from '../src/database/site-data';

/** The vectors are kept in the database: they are put aside before the tables are dropped and put back on the same documents. */
async function keepEmbeddings(connection: PoolClient): Promise<void> {
  const { rows } = await connection.query(`SELECT to_regclass('${REMOTE_SCHEMA}.documents') IS NOT NULL AS found`);
  const source: string = rows[0].found ? `SELECT code_text, embedding FROM ${REMOTE_SCHEMA}.documents WHERE embedding IS NOT NULL` : 'SELECT NULL::text AS code_text, NULL::text AS embedding WHERE false';
  await connection.query(`CREATE TEMP TABLE kept_embeddings ON COMMIT DROP AS ${source}`);
}

async function putEmbeddingsBack(connection: PoolClient): Promise<void> {
  await connection.query(`UPDATE ${REMOTE_SCHEMA}.documents d SET embedding = k.embedding::vector FROM kept_embeddings k WHERE d.code_text = k.code_text`);
}

async function rebuild(connection: PoolClient, data: SiteData): Promise<void> {
  await keepEmbeddings(connection);
  // The names of the tables carry the schema: a bare name could reach a table of another app of the project through the search path.
  await connection.query(`SET LOCAL search_path TO ${REMOTE_SCHEMA}, extensions, public; DROP TABLE IF EXISTS ${REMOTE_SCHEMA}.documents, ${REMOTE_SCHEMA}.chapters CASCADE`);
  await connection.query(readFileSync(join(__dirname, '..', 'src', 'database', 'schema.sql'), 'utf8'));
  await loadData({ transaction: (work) => work(connection) }, data);
  await putEmbeddingsBack(connection);
}

async function main(): Promise<void> {
  const databaseUrl: string | undefined = process.env.DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl === '') throw new Error('Set DATABASE_URL (in apps/server/.env or in the shell): the address of the remote PostgreSQL');
  const data: SiteData = await getSiteData();
  const pool = createRemotePool(databaseUrl);
  const connection: PoolClient = await pool.connect();
  try {
    await connection.query('CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions');
    await connection.query('BEGIN');
    await rebuild(connection, data);
    await connection.query('COMMIT');
    const { rows } = await connection.query(`SELECT (SELECT count(*)::int FROM ${REMOTE_SCHEMA}.documents) AS documents, (SELECT count(*)::int FROM ${REMOTE_SCHEMA}.chapters) AS chapters`);
    console.log(`Pushed to the schema ${REMOTE_SCHEMA}: ${rows[0].documents} documents, ${rows[0].chapters} chapters`);
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
