import { Pool } from 'pg';

/**
 * A small pool of connections to the remote database, from its address (`DATABASE_URL`). Three connections are enough: a
 * serverless instance answers few requests at once. The connection is encrypted, and the `sslmode` of the address is dropped:
 * `pg` would let it replace the settings given here. The certificate of the pooler of Supabase is not checked (a proof of
 * concept: the address and the password are the secret, and the traffic is encrypted).
 */
export function createRemotePool(databaseUrl: string): Pool {
  const address: URL = new URL(databaseUrl);
  address.searchParams.delete('sslmode');
  return new Pool({ connectionString: address.toString(), ssl: { rejectUnauthorized: false }, max: 3, connectionTimeoutMillis: 10_000 });
}
