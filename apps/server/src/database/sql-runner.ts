/** Anything that can run one SQL query: a transaction of PGlite, or a connection of the remote database (`pg`). */
export interface SqlRunner {
  query(sql: string, parameters?: unknown[]): Promise<unknown>;
}
