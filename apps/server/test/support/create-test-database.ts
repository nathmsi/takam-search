import { DatabaseService } from '../../src/database/database.service';

/**
 * The real database, in memory, filled with the real data of `data/` (about a second). A test that talks to it tests the
 * real SQL on a real PostgreSQL, not a copy of it. Close it with `await database.onModuleDestroy()`.
 */
export async function createTestDatabase(): Promise<DatabaseService> {
  process.env.DATABASE_DIR = 'memory://';
  const database = new DatabaseService();
  await database.onModuleInit();
  return database;
}
