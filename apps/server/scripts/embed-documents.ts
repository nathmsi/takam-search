/**
 * `GEMINI_API_KEY=... pnpm data:embed [--chapter 1] [--force]`: turns the documents of one main chapter (default: 1) into
 * embeddings with Gemini and writes them in `data/embeddings.json`, which the server loads into the column `documents.embedding` (pgvector).
 *
 * It reads only the fields of the site's own objects: title, description, keywords. Documents already in the file are
 * skipped (`--force` makes them again). The key is read from the environment and never written anywhere.
 * To see it in the search: `pnpm db:reset`, restart the server, tick "search by meaning" (or `?meaning=yes`).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EMBEDDING_DIMENSIONS } from '../src/ai/embedding-dimensions';
import { GeminiProvider } from '../src/ai/providers/gemini.provider';

interface SiteDocument {
  readonly documentcodetext: string | null;
  readonly mainchaptercode: number | null;
  readonly name: string | null;
  readonly description: string | null;
  readonly keywords: string | null;
}

interface EmbeddingsFile {
  model: string;
  dimensions: number;
  vectors: Record<string, number[]>;
}

const DATA_FILE: string = join(__dirname, '..', 'data', 'embeddings.json');
const BATCH_SIZE = 50;
const provider = new GeminiProvider();

/** What is embedded: the three text fields of the object, one per line. */
function textOf(document: SiteDocument): string {
  return [document.name, document.description, document.keywords].map((field) => (field ?? '').replace(/[‎‏]/g, '').trim()).filter((field) => field !== '').join('\n');
}

function readExisting(force: boolean): EmbeddingsFile {
  const empty: EmbeddingsFile = { model: provider.embeddingModel, dimensions: EMBEDDING_DIMENSIONS, vectors: {} };
  if (force || !existsSync(DATA_FILE)) return empty;
  const file = JSON.parse(readFileSync(DATA_FILE, 'utf8')) as EmbeddingsFile;
  return file.model === provider.embeddingModel && file.dimensions === EMBEDDING_DIMENSIONS ? file : empty;
}

async function main(): Promise<void> {
  if (!provider.isConfigured()) throw new Error('Set GEMINI_API_KEY in the shell: GEMINI_API_KEY=... pnpm data:embed');
  const chapterIndex: number = process.argv.indexOf('--chapter');
  const chapter = Number(chapterIndex === -1 ? 1 : process.argv[chapterIndex + 1]);
  const file: EmbeddingsFile = readExisting(process.argv.includes('--force'));
  const documents: SiteDocument[] = (JSON.parse(readFileSync(join(__dirname, '..', 'data', 'Document.json'), 'utf8')) as SiteDocument[]).filter(
    (document) => document.documentcodetext && document.mainchaptercode === chapter && !(document.documentcodetext in file.vectors) && textOf(document) !== '',
  );
  console.log(`Chapter ${chapter}: ${documents.length} documents to embed (${Object.keys(file.vectors).length} already done).`);
  for (let start = 0; start < documents.length; start += BATCH_SIZE) {
    const batch: SiteDocument[] = documents.slice(start, start + BATCH_SIZE);
    const vectors: number[][] = await provider.embed({ texts: batch.map(textOf), task: 'document' });
    batch.forEach((document, index) => (file.vectors[document.documentcodetext as string] = vectors[index]));
    writeFileSync(DATA_FILE, JSON.stringify(file));
    console.log(`  ${Math.min(start + BATCH_SIZE, documents.length)} / ${documents.length}`);
  }
  console.log(`Done: ${Object.keys(file.vectors).length} documents in data/embeddings.json.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
