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

## Limits you should know

- The search reads titles, descriptions, keywords and numbers, **not the text of the instructions**, and it has no notion of meaning: a synonym is not a match.
- The Hebrew rules (endings and prefixes) are simple rules, not a dictionary: they are right most of the time and sometimes wrong, in the same way on both sides of the comparison. They are tested on word pairs, not measured on real questions.
- 7 of the 11 instructions that the site does not show in its tree say in their description that they were merged or renumbered, so the site probably hides them on purpose; here they are kept and their description tells where they went. They count as "in force" because the data gives them no end date.
- The data is a snapshot of 2026-11-11, two committed files. The interface is Hebrew only.
- The harm of the problem on real users was not measured.

## Engineering questions (part C of the assignment)

To write: the design decisions and alternatives (the table of [docs/architecture.md](docs/architecture.md) is the raw material), a limit that hurts maintenance, deploying it from another developer's machine, and a failure scenario with how it is found. The audit of the site's API ([docs/site-audit.md](docs/site-audit.md)) gives real failure cases.
