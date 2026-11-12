import type { SqlRunner } from './sql-runner';

/** A database that can run several queries as one transaction: PGlite, or the remote one (see `scripts/push-database.ts`). */
export interface TransactionRunner {
  transaction(work: (runner: SqlRunner) => Promise<void>): Promise<unknown>;
}
