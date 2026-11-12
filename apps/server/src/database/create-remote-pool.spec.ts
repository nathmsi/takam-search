import { createRemotePool } from './create-remote-pool';

describe('createRemotePool', () => {
  it('encrypts the connection, and drops the sslmode of the address so that it cannot replace that', async () => {
    const pool = createRemotePool('postgresql://user:secret@db.example.test:6543/postgres?sslmode=require');

    expect(pool.options.connectionString).not.toContain('sslmode');
    expect(pool.options.ssl).toEqual({ rejectUnauthorized: false });
    await pool.end();
  });

  it('keeps the rest of the address and a small pool', async () => {
    const pool = createRemotePool('postgresql://user:secret@db.example.test:6543/postgres');

    expect(pool.options.connectionString).toContain('db.example.test:6543/postgres');
    expect(pool.options.max).toBe(3);
    await pool.end();
  });
});
