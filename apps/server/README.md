# The server (NestJS)

A small read-only API over a local PostgreSQL database. Start it with `pnpm dev` from the root (port 3100).

```
src/
  main.ts                  starts the server
  app.module.ts            lists the four parts
  database/                THE DATABASE
    schema.sql               the tables and the SQL functions that clean Hebrew
    database.service.ts      opens the database, runs schema.sql, fills it if empty, query()
    load-data.ts             data/Document.json + Chapter.json  ->  rows
  documents/               THE ROUTE /v1/documents
    documents.controller.ts  the route and its parameters
    documents.service.ts     defaults, and "no document has every word -> show the closest"
    documents.repository.ts  THE SQL (the search is SEARCH_SQL)
  chapters/                THE ROUTE /v1/chapters   (controller + SQL)
  health/                  THE ROUTE /health
  errors/                  the one JSON body of every error
data/                      the two objects of the Takam site
scripts/query.ts           pnpm db:query "SELECT ..."
scripts/refresh-data.ts    pnpm data:refresh (read the site again, replace data/)
test/                      end-to-end tests, one file per route
```

A request goes **controller → service → repository → database**, and nothing else.

Useful commands (from the root):

```bash
pnpm db:query "SELECT code_text, title FROM documents WHERE chapter_code = '1.4' ORDER BY natural_key(code)"
pnpm db:reset      # forget the database; the next start rebuilds it from data/
```

More: [docs/architecture.md](../../docs/architecture.md), [docs/data.md](../../docs/data.md), [docs/api.md](../../docs/api.md).
