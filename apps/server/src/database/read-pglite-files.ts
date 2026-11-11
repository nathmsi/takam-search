import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Extension, PGliteOptions } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';

type WasmModule = NonNullable<PGliteOptions['pgliteWasmModule']>;

/** The binary files PostgreSQL (PGlite) and its pgvector extension are made of, ready to give to its constructor. */
interface PgliteFiles {
  readonly pgliteWasmModule: WasmModule;
  readonly initdbWasmModule: WasmModule;
  readonly fsBundle: Blob;
  readonly extensions: { readonly vector: Extension };
}

// Node has `WebAssembly`; the server's TypeScript setup has no DOM library to describe it, so only what is used is described.
const { compile } = (globalThis as unknown as { WebAssembly: { compile(bytes: Uint8Array): Promise<WasmModule> } }).WebAssembly;

/**
 * PGlite finds its own binary files (the compiled PostgreSQL, about 15 MB, and the 50 KB of pgvector) by a path hidden inside
 * the library, where a deployment tool cannot see them and leaves them out. Here we read them ourselves, with plain file paths
 * a tool can follow, so they are part of what is deployed. The paths are written in full on purpose: do not build them in a variable.
 * pgvector wants a file to open: its bytes are copied to the temporary folder first (the only folder a deployment can write in).
 */
export async function readPgliteFiles(): Promise<PgliteFiles> {
  const vectorFile: string = join(tmpdir(), 'takam-vector.tar.gz');
  writeFileSync(vectorFile, readFileSync(join(__dirname, '..', '..', 'node_modules', '@electric-sql', 'pglite-pgvector', 'dist', 'vector.tar.gz')));
  return {
    pgliteWasmModule: await compile(readFileSync(join(__dirname, '..', '..', 'node_modules', '@electric-sql', 'pglite', 'dist', 'pglite.wasm'))),
    initdbWasmModule: await compile(readFileSync(join(__dirname, '..', '..', 'node_modules', '@electric-sql', 'pglite', 'dist', 'initdb.wasm'))),
    fsBundle: new Blob([readFileSync(join(__dirname, '..', '..', 'node_modules', '@electric-sql', 'pglite', 'dist', 'pglite.data'))]),
    extensions: { vector: { name: vector.name, setup: async (pg, options) => ({ ...(await vector.setup(pg, options)), bundlePath: pathToFileURL(vectorFile) }) } },
  };
}
