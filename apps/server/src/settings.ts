/** What can be set from the environment (see `.env.example`). */
export interface Settings {
  /** The port of the API. */
  readonly port: number;
  /** The origins allowed to call the API from a browser. */
  readonly corsOrigins: readonly string[];
}

const DEFAULT_PORT = 3100;
const DEFAULT_CORS_ORIGINS = 'http://localhost:5173,http://localhost:4173';

/** Reads `PORT` and `CORS_ORIGINS`. A port that is not a number stops the server at startup with a clear message. */
export function readSettings(environment: NodeJS.ProcessEnv = process.env): Settings {
  const port: number = environment.PORT === undefined ? DEFAULT_PORT : Number(environment.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`PORT must be a number from 1 to 65535, not "${environment.PORT}"`);
  const corsOrigins: string[] = (environment.CORS_ORIGINS ?? DEFAULT_CORS_ORIGINS)
    .split(',')
    .map((origin: string) => origin.trim())
    .filter((origin: string) => origin !== '');
  return { port, corsOrigins };
}
