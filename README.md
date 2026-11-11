# Takam Search

A better search for the **Takam instructions**: the binding rules of Israel's Accountant General for every government ministry ([takam.mof.gov.il](https://takam.mof.gov.il)).

A React web app and a NestJS API over a local PostgreSQL database, in one pnpm monorepo. Everything is TypeScript.

## The problem

A civil servant with a concrete situation, such as *"what do I do if the budget is exceeded?"*, cannot reliably get to the rule that applies. The search of the site (in its source, `filterByFreeTxt`) is a plain "contains" on the title, the description, the keywords and the number. Observed on the site:

| You type | What the site does |
|---|---|
| `קופת ביטחון`, then `קופות ביטחון` | 2 results, then 4: the singular does not find the plural |
| `התחייבות`, then `התחייבויות` | 11 results, then 5 |
| `מה עושים כשיש חריגה` | 0 results: a question is not a title |
| `מקדמות ללא התחייבות` | 0 results, although the instructions on advances and on payments without commitments exist |
| anything with no result | the address becomes `/document/undefined` and the page stays empty, with no help |

Behind it, more defects: an inverted validity flag, a chapter missing from the filter, a tag filter with no data ([docs/site-audit.md](docs/site-audit.md)). The people affected are the staff of the ministries who must apply these rules; that they lose time or apply a wrong rule is a reasonable hypothesis, not a measurement.

## The solution

The same documents, but searched by the server, in SQL, on cleaned columns:

- **Singular and plural are the same word**, quotes inside a word do not matter (`דו"ח` = `דוח`), the little words of a question are ignored (`מה`, `האם`, `כשיש`...).
- **Every word must match; if no document has them all, the closest ones are shown, and the answer says so.** A question is never a dead end.
- **Best match first** (a word in the title or the number counts more than one in the description), then the order of the numbers.
- **Filters on the server too**: chapter, sub-chapter, kind of document, in force or not (computed from the dates, not from the site's inverted flag).
- **Nothing found is a normal answer**, with a valid address and a way to clear the filters.

Only the **metadata of the site's own objects** is searched (title, description, keywords, number, dates, chapters): no document is read.

## Run it

Prerequisites: Node ≥ 22 and pnpm 11 (`corepack enable`).

```bash
pnpm install        # also builds packages/contracts
pnpm dev            # API on http://localhost:3100, web app on http://localhost:5173
```

Open <http://localhost:5173> (the home page); the search is at `/documents`. The API's own pages: <http://localhost:3100/docs> (Swagger) and <http://localhost:3100/health>.

The first start creates the database (about two seconds) in `apps/server/.pgdata/`. Nothing to install, no secret, no `.env` file needed: [`.env.example`](.env.example) lists the optional variables (`PORT`, `CORS_ORIGINS`, `DATABASE_DIR`, `VITE_API_URL`).

| Command | What it does |
|---|---|
| `pnpm dev` | API and web app with reload |
| `pnpm build` | Builds the contracts, the server and the web app |
| `pnpm lint` | oxlint |
| `pnpm typecheck` | `tsc` on the three packages |
| `pnpm test` | Server (unit + end-to-end) and web (unit + component) tests |
| `pnpm test:e2e` | Builds both apps and runs the Playwright suite (phone and desktop, axe in both themes) on its own ports |
| `pnpm db:query "SELECT …"` | Runs a SQL query on a fresh copy of the database and prints the rows |
| `pnpm db:reset` | Forgets the database; the next start rebuilds it |

If something already listens on port 3100 or 5173, set `PORT` (and `API_PROXY_TARGET` for the web dev server).

## How it is built

```
Document.json + Chapter.json ──(first start)──▶ PostgreSQL (PGlite) ──▶ NestJS API ──/v1──▶ React app
 the objects of the Takam site                    2 tables                the search = one SQL query
```

| Part | |
|---|---|
| `apps/server` | NestJS 11, one folder per route (controller → service → repository → database). The search is `SEARCH_SQL` in `src/documents/documents.repository.ts`; the cleaning of Hebrew is the SQL functions of `src/database/schema.sql`. See [apps/server/README.md](apps/server/README.md) |
| `apps/web` | React 19, Vite, React Query, React Router, CSS Modules over design tokens (light and dark), Heebo font, laid out in the order of the official site ([docs/ui.md](docs/ui.md)). Vitest, Testing Library and Playwright |
| `packages/contracts` | The types of the API answers, shared by the two apps |
| `.github/workflows/ci.yml` | Lint, type-check, build, server and web tests, then Playwright on the builds |

**PostgreSQL itself runs inside the server** ([PGlite](https://pglite.dev)): the same SQL as a PostgreSQL server, with nothing to install. A shared server would change the connection, not the queries.

More: [docs/README.md](docs/README.md) is the map ([architecture](docs/architecture.md), [data](docs/data.md), [API](docs/api.md), [interface](docs/ui.md), [site audit](docs/site-audit.md), [testing](docs/testing.md)). [CLAUDE.md](CLAUDE.md) holds the rules for whoever changes the code.

## Deployed (Vercel)

- Web: https://takam-search.vercel.app
- API: https://takam-search-api.vercel.app (try `/health`, `/v1/documents?q=קופות ביטחון`)

Two Vercel projects, one per app. Settings live on Vercel, set with the CLI: the API has `CORS_ORIGINS` (the address of the web app), the web app has `VITE_API_URL` (the address of the API) and a rewrite of every path to `index.html` (`apps/web/vercel.json`).
The database is built in memory on every cold start of the API (about 8 to 10 seconds for the first request, then fast). PGlite's binary files are read in `read-pglite-files.ts` with plain paths so that Vercel includes them.
The API is deployed from the repository root, with `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` set, using `vercel build --prod` then `vercel deploy --prebuilt --prod`.

## Limits you should know

- The search reads titles, descriptions, keywords and numbers, **not the text of the instructions**, and it has no notion of meaning: a synonym is not a match.
- The Hebrew rules (endings and prefixes) are simple rules, not a dictionary: they are right most of the time and sometimes wrong, in the same way on both sides of the comparison. They are tested on word pairs, not measured on real questions.
- 7 of the 11 instructions that the site does not show in its tree say in their description that they were merged or renumbered, so the site probably hides them on purpose; here they are kept and their description tells where they went. They count as "in force" because the data gives them no end date.
- The data is a snapshot of 2026-11-11, two committed files. The interface is Hebrew only.
- The harm of the problem on real users was not measured.

## Engineering questions (part C of the assignment)

### 1. Design decisions and the alternatives I weighed

| Decision | Alternative | Why this one |
|---|---|---|
| Search is **one SQL query** on cleaned columns | A search service (Elasticsearch, Meilisearch) or filtering in the browser | The data is small (922 documents). SQL runs where the data is and can be read in one file (`SEARCH_SQL`). A separate service is a second thing to run for no gain at this size |
| **The same SQL function cleans the stored text and the typed words** | Cleaning in TypeScript for the query only | Both sides always agree. If the rule changes, the data and the query change together |
| **PostgreSQL inside the server (PGlite)** | SQLite, or a hosted PostgreSQL | Real PostgreSQL SQL with nothing to install. Moving to a shared server is the same SQL behind another connection |
| **Only the metadata** of the site's objects | Indexing the text of the .docx files | The metadata is what the site already knows; reading the documents is a larger project with its own risks (parsing, size, freshness) |
| **Every word must match, else the closest documents, said so** | Always "any word", or an empty result | A question never ends on an empty page, and the person is told when the answer is only close |
| **"In force" computed from dates** | Trust the API flag `isvalid` | The flag is inverted in the site's API (see [docs/site-audit.md](docs/site-audit.md)) |
| Plain server (controller, service, repository per folder) | Ports and adapters, an ORM | A reader follows a request in four files |

### 2. A limit that hurts maintenance

**The data is a snapshot of two committed JSON files**, loaded when the database is empty. When the Takam site changes an instruction, nothing here changes until someone re-reads the site, replaces the files and resets the database (`pnpm db:reset`). The Hebrew cleaning is also a set of hand-written rules, not a dictionary, so a wrong stem needs a change in `schema.sql` and a test on word pairs. The fix I would make first is a scheduled job that re-reads the site's API, rebuilds the tables, and reports what changed.

### 3. Deploying it from another developer's machine

```bash
pnpm install          # also builds packages/contracts
pnpm dev              # API on :3100, web on :5173, nothing else to install
pnpm test && pnpm test:e2e
```

No secret is needed to run it; `.env.example` lists the optional variables (`PORT`, `CORS_ORIGINS`, `DATABASE_DIR`, `VITE_API_URL`). To deploy, run `vercel login`, then link the two projects (`takam-search-api`, `takam-search`), set `CORS_ORIGINS` on the API and `VITE_API_URL` on the web app with `vercel env add`, and deploy as described in "Deployed (Vercel)". The API must be deployed from the repository root, because the build output refers to root-relative paths. CI (`.github/workflows/ci.yml`) runs lint, types, build and all tests on every push.

### 4. A failure scenario and how it is found

**Scenario: the site changes the shape of its data** (a renamed field, or `documentcodetext` empty), and a new load gives documents that cannot be found by number. Searches by number return nothing and the cold start still looks healthy.

How it is found: `/health` reports the number of documents and chapters loaded, so a drop to a few rows or to zero shows at once; the repository tests assert on real numbers (418 instructions, 243 forms, `H.1.2.1` with its chapters); and the loader only keeps rows that have a code, so such a change would show as a drop in that count. A check that makes the load fail loudly is not written yet. A real failure of the original site is the same kind: its page goes to `/document/undefined` when nothing is found, which no monitoring of the server would catch. Here an empty result is a normal 200 with an empty list, and an end-to-end test covers the empty state.

Another failure is the cold start: the database is rebuilt in memory on every cold start of the API, so the first request takes 8 to 10 seconds. It is visible in the response time of `/health`; the fix is a warm instance or a persistent PostgreSQL.
