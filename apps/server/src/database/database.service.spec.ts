import type { Pool } from 'pg';
import * as poolModule from './create-remote-pool';
import { DatabaseService } from './database.service';

/** The remote database (`DATABASE_URL`), with the pool of connections faked: what the service sends, and what it does when a query fails. */
describe('DatabaseService with DATABASE_URL', () => {
  const connection = { query: jest.fn(), release: jest.fn() };
  const pool = { connect: jest.fn(), end: jest.fn() };
  let service: DatabaseService;

  beforeEach(async () => {
    jest.resetAllMocks();
    pool.connect.mockResolvedValue(connection);
    jest.spyOn(poolModule, 'createRemotePool').mockReturnValue(pool as unknown as Pool);
    process.env.DATABASE_URL = 'postgresql://user:secret@db.example.test:6543/postgres';
    service = new DatabaseService();
    await service.onModuleInit();
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('reads in a read-only transaction whose search path starts with our schema, and gives the rows', async () => {
    connection.query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ total: 922 }] }).mockResolvedValueOnce({});

    const rows = await service.query<{ total: number }>('SELECT count(*)::int AS total FROM documents', ['x']);

    expect(rows).toEqual([{ total: 922 }]);
    expect(connection.query.mock.calls[0][0]).toMatch(/BEGIN READ ONLY; SET LOCAL search_path TO takam_poc/);
    expect(connection.query.mock.calls[1]).toEqual(['SELECT count(*)::int AS total FROM documents', ['x']]);
    expect(connection.query.mock.calls[2][0]).toBe('COMMIT');
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back, gives the connection back and passes the error on when the query fails', async () => {
    connection.query.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({});

    await expect(service.query('SELECT 1')).rejects.toThrow('boom');

    expect(connection.query.mock.calls[2][0]).toBe('ROLLBACK');
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it('still gives the original error when the rollback fails too', async () => {
    connection.query.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('boom')).mockRejectedValueOnce(new Error('connection lost'));

    await expect(service.query('SELECT 1')).rejects.toThrow('boom');
  });

  it('closes the pool when the server stops', async () => {
    await service.onModuleDestroy();

    expect(pool.end).toHaveBeenCalledTimes(1);
  });
});
