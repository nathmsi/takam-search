/**
 * `pnpm data:embed [--chapter 1 | --all] [--force]`: turns the documents of one main chapter (default: 1), or every document (`--all`), into
 * embeddings with Gemini and writes them in `data/embeddings.json`, which the server loads into the column `documents.embedding` (pgvector).
 *
 * It reads only the fields of the site's own objects: title, description, keywords. Only what is new or whose text changed is
 * sent to Gemini (a hash of the text is kept next to each vector); a document that left the site loses its vector (`--force`
 * makes everything again), so the daily job can run it and pay only for what changed. The key is read from the environment and never written anywhere.
 * To see it in the search: `pnpm db:reset`, restart the server, tick "search by meaning" (or `?meaning=yes`).
 */
import { createHash } from 'node:crypto';
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
  /** The hash of the text each vector was made from: when the text changes, the vector is made again. */
  hashes: Record<string, string>;
}

const DATA_FILE: string = join(__dirname, '..', 'data', 'embeddings.json');
const BATCH_SIZE = 50;
const provider = new GeminiProvider();

/** What is embedded: the three text fields of the object, one per line. */
function textOf(document: SiteDocument): string {
  return [document.name, document.description, document.keywords].map((field) => (field ?? '').replace(/[‎‏]/g, '').trim()).filter((field) => field !== '').join('\n');
}

function readExisting(force: boolean): EmbeddingsFile {
  const empty: EmbeddingsFile = { model: provider.embeddingModel, dimensions: EMBEDDING_DIMENSIONS, vectors: {}, hashes: {} };
  if (force || !existsSync(DATA_FILE)) return empty;
  const file = JSON.parse(readFileSync(DATA_FILE, 'utf8')) as EmbeddingsFile;
  return file.model === provider.embeddingModel && file.dimensions === EMBEDDING_DIMENSIONS ? { ...file, hashes: file.hashes ?? {} } : empty;
}

const hashOf = (document: SiteDocument): string => createHash('sha1').update(textOf(document)).digest('hex');

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

async function main(): Promise<void> {
  if (!provider.isConfigured()) throw new Error('Set GEMINI_API_KEY in the shell: GEMINI_API_KEY=... pnpm data:embed');
  const chapterIndex: number = process.argv.indexOf('--chapter');
  const chapter = Number(chapterIndex === -1 ? 1 : process.argv[chapterIndex + 1]);
  const everything: boolean = process.argv.includes('--all');
  const file: EmbeddingsFile = readExisting(process.argv.includes('--force'));
  const all: SiteDocument[] = (JSON.parse(readFileSync(join(__dirname, '..', 'data', 'Document.json'), 'utf8')) as SiteDocument[]).filter((document) => document.documentcodetext && textOf(document) !== '');
  const onTheSite = new Set(all.map((document) => document.documentcodetext as string));
  for (const codeText of Object.keys(file.vectors)) {
    if (!onTheSite.has(codeText)) {
      delete file.vectors[codeText];
      delete file.hashes[codeText];
    }
  }
  // A vector without a hash (a file made before hashes existed) is taken as current, and gets its hash without a call.
  for (const document of all) file.hashes[document.documentcodetext as string] ??= document.documentcodetext as string in file.vectors ? hashOf(document) : '';
  const documents: SiteDocument[] = all.filter(
    (document) => (everything || document.mainchaptercode === chapter) && (!((document.documentcodetext as string) in file.vectors) || file.hashes[document.documentcodetext as string] !== hashOf(document)),
  );
  console.log(`${everything ? 'All chapters' : `Chapter ${chapter}`}: ${documents.length} documents to embed (${Object.keys(file.vectors).length} already done).`);
  for (let start = 0; start < documents.length; start += BATCH_SIZE) {
    const batch: SiteDocument[] = documents.slice(start, start + BATCH_SIZE);
    const vectors: number[][] = await embedWithPatience(batch.map(textOf));
    batch.forEach((document, index) => {
      file.vectors[document.documentcodetext as string] = vectors[index];
      file.hashes[document.documentcodetext as string] = hashOf(document);
    });
    writeFileSync(DATA_FILE, JSON.stringify(file));
    console.log(`  ${Math.min(start + BATCH_SIZE, documents.length)} / ${documents.length}`);
  }
  writeFileSync(DATA_FILE, JSON.stringify(file));
  console.log(`Done: ${Object.keys(file.vectors).length} documents in data/embeddings.json.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
