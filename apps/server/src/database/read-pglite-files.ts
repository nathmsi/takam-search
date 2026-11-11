import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGliteOptions } from '@electric-sql/pglite';

type WasmModule = NonNullable<PGliteOptions['pgliteWasmModule']>;

/** The three binary files PostgreSQL (PGlite) is made of, ready to give to its constructor. */
interface PgliteFiles {
  readonly pgliteWasmModule: WasmModule;
  readonly initdbWasmModule: WasmModule;
  readonly fsBundle: Blob;
}

// Node has `WebAssembly`; the server's TypeScript setup has no DOM library to describe it, so only what is used is described.
const { compile } = (globalThis as unknown as { WebAssembly: { compile(bytes: Uint8Array): Promise<WasmModule> } }).WebAssembly;

/**
 * PGlite finds its own binary files (the compiled PostgreSQL, about 15 MB) by a path hidden inside the library, where a
 * deployment tool cannot see them and leaves them out. Here we read them ourselves, with plain file paths a tool can follow,
 * so they are part of what is deployed. The paths are written in full on purpose: do not build them in a variable.
 */
export async function readPgliteFiles(): Promise<PgliteFiles> {
  return {
    pgliteWasmModule: await compile(readFileSync(join(__dirname, '..', '..', 'node_modules', '@electric-sql', 'pglite', 'dist', 'pglite.wasm'))),
    initdbWasmModule: await compile(readFileSync(join(__dirname, '..', '..', 'node_modules', '@electric-sql', 'pglite', 'dist', 'initdb.wasm'))),
    fsBundle: new Blob([readFileSync(join(__dirname, '..', '..', 'node_modules', '@electric-sql', 'pglite', 'dist', 'pglite.data'))]),
  };
}
