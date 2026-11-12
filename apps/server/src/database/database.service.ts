import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Pool } from 'pg';
import { createRemotePool } from './create-remote-pool';
import { getSiteData } from './get-site-data';
import { loadData } from './load-data';
import { readPgliteFiles } from './read-pglite-files';
import { REMOTE_SCHEMA } from './remote-schema';

/**
 * The database: PostgreSQL, in one of two places.
 *  - By default PGlite, PostgreSQL itself running inside the server, so nothing has to be installed. It lives in the folder
 *    `DATABASE_DIR` (default `apps/server/.pgdata`; `memory://` keeps it in memory, as the tests do). When the server starts it
 *    creates the tables (`schema.sql`) and, if they are empty, fills them from the Takam site (`getSiteData`).
 *  - With `DATABASE_URL` set, a remote PostgreSQL (Supabase, in the schema `takam_poc`), filled beforehand by `pnpm db:push`.
 *    The server then starts at once: it builds nothing, which is what a cold start on Vercel needs.
 * Every other part of the server talks to the database through {@link DatabaseService.query}.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(DatabaseService.name);
  private database: PGlite | null = null;
  private pool: Pool | null = null;

  async onModuleInit(): Promise<void> {
    const databaseUrl: string | undefined = process.env.DATABASE_URL;
    if (databaseUrl !== undefined && databaseUrl !== '') {
      this.pool = createRemotePool(databaseUrl);
      return;
    }
    const database: PGlite = await PGlite.create({ dataDir: process.env.DATABASE_DIR ?? join(__dirname, '..', '..', '.pgdata'), ...(await readPgliteFiles()) });
    this.database = database;
    await database.exec(readFileSync(join(__dirname, 'schema.sql'), 'utf8'));
    const [{ count }] = await this.query<{ count: number }>('SELECT count(*)::int AS count FROM documents');
    if (count > 0) return;
    await loadData(database, await getSiteData());
    this.logger.log('The database was empty: loaded the documents and the chapters of the Takam site');
  }

  async onModuleDestroy(): Promise<void> {
    await this.database?.close();
    await this.pool?.end();
  }

  /** Runs one SQL query. Values go in `parameters` ($1, $2...), never inside the text of the query. */
  async query<Row>(sql: string, parameters: unknown[] = []): Promise<Row[]> {
    if (this.pool !== null) return this.queryRemote<Row>(this.pool, sql, parameters);
    return (await (this.database as PGlite).query<Row>(sql, parameters)).rows;
  }

  /**
   * The same query on the remote database, in a read-only transaction whose search path starts with our schema. The path is set
   * for the transaction only (`SET LOCAL`): the pooler of Supabase may give the next query another connection.
   */
  private async queryRemote<Row>(pool: Pool, sql: string, parameters: unknown[]): Promise<Row[]> {
    const connection = await pool.connect();
    try {
      await connection.query(`BEGIN READ ONLY; SET LOCAL search_path TO ${REMOTE_SCHEMA}, extensions, public`);
      const { rows } = await connection.query(sql, parameters);
      await connection.query('COMMIT');
      return rows as Row[];
    } catch (error) {
      await connection.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      connection.release();
    }
  }
}
