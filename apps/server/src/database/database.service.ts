import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { loadData } from './load-data';

/**
 * The local database: PostgreSQL itself, running inside the server (PGlite), so nothing has to be installed.
 * It lives in the folder `DATABASE_DIR` (default `apps/server/.pgdata`; `memory://` keeps it in memory, as the tests do).
 * When the server starts it creates the tables (`schema.sql`) and, if they are empty, fills them from `data/`.
 * Every other part of the server talks to the database through {@link DatabaseService.query}.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(DatabaseService.name);
  private database!: PGlite;

  async onModuleInit(): Promise<void> {
    this.database = await PGlite.create(process.env.DATABASE_DIR ?? join(__dirname, '..', '..', '.pgdata'));
    await this.database.exec(readFileSync(join(__dirname, 'schema.sql'), 'utf8'));
    const [{ count }] = await this.query<{ count: number }>('SELECT count(*)::int AS count FROM documents');
    if (count > 0) return;
    await loadData(this.database);
    this.logger.log('The database was empty: loaded the documents and the chapters of the Takam site');
  }

  async onModuleDestroy(): Promise<void> {
    await this.database.close();
  }

  /** Runs one SQL query. Values go in `parameters` ($1, $2...), never inside the text of the query. */
  async query<Row>(sql: string, parameters: unknown[] = []): Promise<Row[]> {
    return (await this.database.query<Row>(sql, parameters)).rows;
  }
}
