# Architecture

```
 Document.json + Chapter.json ──(first start)──▶ local PostgreSQL ──▶ NestJS API ──/v1──▶ React app
 (objects of the Takam site)       load-data.ts   (PGlite, 2 tables)   (search = one SQL query)
```

## The server, folder by folder (`apps/server/src`)

| Folder | What it is |
|---|---|
| `main.ts`, `app.module.ts` | Start-up, and the list of the four parts below |
| `database/` | **The database.** `schema.sql` (tables and functions), `database.service.ts` (opens it, runs the schema, fills it if empty, `query()`), `load-data.ts` (the two JSON files → rows) |
| `ai/` | **The AI side.** `ai.service.ts` (`AiService`: picks the provider, maps failures to 503, `embedQuestion`), `providers/ai-provider.interface.ts` (`AiProvider`), `providers/gemini.provider.ts` (Gemini over REST, with retries), `embedding-dimensions.ts` (768). Same shape as the AI module of `jobs-monitor-api` |
| `documents/` | **The route `/v1/documents`.** `documents.controller.ts` (the route), `documents.service.ts` (defaults, and "no document has every word → show the closest"), `documents.repository.ts` (**the SQL**), `list-documents.query.ts` (the parameters allowed), `parse-code-text.pipe.ts` |
| `chapters/` | **The route `/v1/chapters`.** `chapters.controller.ts`, `chapters.repository.ts` (SQL) |
| `health/` | **The route `/health`** |
| `errors/` | The one JSON body of every error |
| `settings.ts`, `configure-app.ts` | The environment (`PORT`, `CORS_ORIGINS`), and what `main.ts` and the tests share (security headers, read-only CORS, validation) |

The reading order of a request (with `meaning=yes` the service also asks `AiService` for the embedding of the question): **controller** (the route and its parameters) → **service** (the little logic) → **repository** (the SQL) → **database**. Nothing else.

## The web app (`apps/web/src`)

A Vite + React single-page app, right-to-left Hebrew, in the order of the official site ([ui.md](ui.md)): a home page, a search page that shows the list and the selected document side by side, and a not-found page. The filters live in the address, the selected document in the path. Light and dark themes. It asks the server for everything: **no search runs in the browser**.

`packages/contracts` holds the types of every answer: the server builds them, the web app reads them.

## Decisions

| Decision | Why | What we gave up |
|---|---|---|
| **The search is one SQL query**, on cleaned columns of the table | It runs where the data is, in the open, and a person can read it (`SEARCH_SQL`). The same function cleans the stored text and the words typed, so both sides always agree | A hand-made stemming rule, not a dictionary: wrong sometimes, in the same way on both sides |
| **PostgreSQL inside the server (PGlite)** | A real PostgreSQL, the same SQL as a server, with nothing to install: `pnpm install && pnpm dev` is enough. The tests run the real SQL on the real data | One process owns the database folder. A shared server (PostgreSQL) is the same SQL behind another connection |
| **Only the metadata of the site's objects** (title, description, keywords, number, dates, chapters) | It is what the site already knows; no document is read | The text of an instruction is not searched |
| **Two plain tables**, loaded from the two JSON files when the database is empty | Easy to read, easy to query (`pnpm db:query`) | Updating the data means `pnpm data:refresh` (daily by a workflow) then a redeploy or `pnpm db:reset` |
| **"In force" is computed from the dates, in SQL** | The API flag `isvalid` is inverted ([site-audit.md](site-audit.md)) | A merged instruction has no end date in the data, so it counts as in force |
| **Every typed word must match, otherwise the closest documents, said so** | A question is never a dead end, and a person is told when the answer is only close | A fixed rule: "some words" is not a ranking by meaning |
| **Search by meaning: an experiment, hybrid, on a pgvector column** of `documents` | A question in other words finds the document ("my supplier was paid late" → late payment), in the same database and the same SQL. The words keep counting, so a number or an exact term still wins | A Gemini key (secret), a call per question, vectors only for the embedded sections, a similarity threshold (0.6) chosen by hand |
| **The server is plain**: controller, service, repository per folder; no ports, no ORM | Short files, the SQL visible | A different database is a change of `database.service.ts`, not a plug-in |
| The interface follows the order of the official site (home, then filters + list + details) | The users of the site know where they are. Logos, illustrations and icons are not copied | The look is ours; it does not claim to be the site |
| The search state lives in the address | A page can be shared; back and forward work | A long query makes a long address |
| Light by default, a dark theme on a button | The official site is light | Two blocks of tokens to keep AA in (a test does) |
| Hebrew only in the interface | The users and the documents are Hebrew | No English interface |

## Not in this POC (on purpose)

Authentication (there is nothing private), rate limiting, the text of the documents, tags, a meaning search on all documents and on the full text (RAG: an answer written by the AI from the documents, with its sources), pagination in the web app (the API has `limit` and `offset`; the list asks for 1000), the attached files.
