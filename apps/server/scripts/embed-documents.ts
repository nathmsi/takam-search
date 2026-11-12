/**
 * `pnpm data:embed [--force]`: gives a vector (Gemini, 768 numbers) to every document of the remote database (`DATABASE_URL`,
 * schema `takam_poc`) that has none, and writes it in the column `documents.embedding` (pgvector). `--force` makes them all again.
 *
 * It reads only the fields of the site's own objects: title, description, keywords. A document that already has a vector keeps it,
 * even when its text changed (for now), so a run pays only for what is new. The keys (GEMINI_API_KEY, DATABASE_URL) are read
 * from the environment and never written anywhere. To see the result: tick "search by meaning" (or `?meaning=yes`).
 */
import type { PoolClient } from 'pg';
import { GeminiProvider } from '../src/ai/providers/gemini.provider';
import { createRemotePool } from '../src/database/create-remote-pool';
import { REMOTE_SCHEMA } from '../src/database/remote-schema';

interface DocumentText {
  readonly code_text: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly keywords: string | null;
}

const BATCH_SIZE = 50;
const provider = new GeminiProvider();

/** What is embedded: the three text fields of the object, one per line. */
function textOf(document: DocumentText): string {
  return [document.title, document.description, document.keywords].map((field) => (field ?? '').trim()).filter((field) => field !== '').join('\n');
}

/** Gemini limits the requests per minute: when it says so (429), wait and ask again instead of stopping half way. */
async function embedWithPatience(texts: string[]): Promise<number[][]> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await provider.embed({ texts, task: 'document' });
    } catch (error) {
      if (attempt >= 5 || !String(error).includes('429')) throw error;
      console.log('  Gemini asks to slow down: waiting 30 seconds');
      await new Promise((resolve) => setTimeout(resolve, 30_000));
    }
  }
}

async function documentsToEmbed(connection: PoolClient, force: boolean): Promise<DocumentText[]> {
  const { rows } = await connection.query<DocumentText>(
    `SELECT code_text, title, description, keywords FROM ${REMOTE_SCHEMA}.documents ${force ? '' : 'WHERE embedding IS NULL'} ORDER BY id`,
  );
  return rows.filter((document) => textOf(document) !== '');
}

async function saveVectors(connection: PoolClient, batch: DocumentText[], vectors: number[][]): Promise<void> {
  await connection.query(`BEGIN; SET LOCAL search_path TO ${REMOTE_SCHEMA}, extensions, public`);
  await connection.query('UPDATE documents d SET embedding = v.embedding::vector FROM unnest($1::text[], $2::text[]) AS v(code_text, embedding) WHERE d.code_text = v.code_text', [
    batch.map((document) => document.code_text),
    vectors.map((vector) => `[${vector.join(',')}]`),
  ]);
  await connection.query('COMMIT');
}

async function main(): Promise<void> {
  if (!provider.isConfigured()) throw new Error('Set GEMINI_API_KEY (in apps/server/.env or in the shell)');
  const databaseUrl: string | undefined = process.env.DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl === '') throw new Error('Set DATABASE_URL (in apps/server/.env or in the shell): the vectors are written in the remote database');
  const pool = createRemotePool(databaseUrl);
  const connection: PoolClient = await pool.connect();
  try {
    const documents: DocumentText[] = await documentsToEmbed(connection, process.argv.includes('--force'));
    console.log(`${documents.length} documents to embed.`);
    for (let start = 0; start < documents.length; start += BATCH_SIZE) {
      const batch: DocumentText[] = documents.slice(start, start + BATCH_SIZE);
      await saveVectors(connection, batch, await embedWithPatience(batch.map(textOf)));
      console.log(`  ${Math.min(start + BATCH_SIZE, documents.length)} / ${documents.length}`);
    }
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
