/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the API is, read at build time. Empty or missing = the same origin (the dev and preview servers forward `/v1`). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
