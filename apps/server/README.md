# The server (NestJS)

A small read-only API over a local PostgreSQL database. Start it with `pnpm dev` from the root (port 3100).

```
src/
  main.ts                  starts the server
  app.module.ts            lists the four parts
  database/                THE DATABASE
    schema.sql               the tables and the SQL functions that clean Hebrew
    database.service.ts      opens the database, runs schema.sql, fills it if empty, query()
    load-data.ts             the site's Document + Chapter  ->  rows (fetch-site-data.ts reads the site)
  ai/                      THE AI SIDE: ai.service.ts, providers/gemini.provider.ts (embeddings for the search by meaning)
  documents/               THE ROUTE /v1/documents
    documents.controller.ts  the route and its parameters
    documents.service.ts     defaults, "no document has every word -> show the closest", and the search by meaning
    documents.repository.ts  THE SQL (the search is SEARCH_SQL)
  chapters/                THE ROUTE /v1/chapters   (controller + SQL)
  health/                  THE ROUTE /health
  errors/                  the one JSON body of every error
scripts/query.ts           pnpm db:query "SELECT ..."
scripts/push-database.ts  pnpm db:push (read the site, rebuild the tables of the remote database)
scripts/embed-documents.ts pnpm data:embed (vectors of the documents that have none, in the remote database)
test/                      end-to-end tests, one file per route; fixtures/ = saved answers of the site
```

A request goes **controller → service → repository → database**, and nothing else.

Useful commands (from the root):

```bash
pnpm db:query "SELECT code_text, title FROM documents WHERE chapter_code = '1.4' ORDER BY natural_key(code)"
pnpm db:reset      # forget the local database; the next start reads the site again
pnpm db:push       # (needs DATABASE_URL) rebuild the tables and read the site into the remote database (Supabase, schema takam_poc)
```

More: [docs/architecture.md](../../docs/architecture.md), [docs/data.md](../../docs/data.md), [docs/api.md](../../docs/api.md).
