# Testing

| Level | Where | Tool | Run |
|---|---|---|---|
| Server unit | `apps/server/src/**/*.spec.ts`, next to the code | Jest | `pnpm --filter @takam/server test:unit` |
| Server end-to-end (one file per route) | `apps/server/test/*.e2e-spec.ts` | Jest + supertest | `pnpm --filter @takam/server test:e2e` |
| Web unit | `apps/web/src/**/*.test.ts` | Vitest (node) | `pnpm --filter @takam/web test:unit` |
| Web component | `apps/web/src/**/*.test.tsx` | Vitest + Testing Library (jsdom) | `pnpm --filter @takam/web test:component` |
| Web end-to-end | `apps/web/e2e/tests/<feature>/` | Playwright, on the builds | `pnpm test:e2e` |

`pnpm test` runs the first four (the server, then the web app); `pnpm test:e2e` builds both apps and runs Playwright.

## What each level proves

- **Server unit** (on the real PostgreSQL, in memory, filled with the real data in about a second):
  - the **SQL functions** (`schema.spec.ts`): singular and plural are the same word, quotes, vowel points, the first word like the others, the little words of a question, `ועד` is not in `מועד`, `1.2` before `1.10`;
  - the **loaded data** (`load-data.spec.ts`): 922 documents, 16 chapters, every instruction has a sub-chapter, chapter 10 recreated, a child takes the chapter of its parent;
  - the **search SQL** (`documents.repository.spec.ts`): by words and by number, the same documents for singular and plural, every word versus any word, ranking, every filter, the date logic, an injection attempt;
  - the **search by meaning** (`documents.repository.spec.ts`, `documents.service.spec.ts`): pgvector on a real column with vectors that point along one axis (similarity 0 or 1): only embedded documents, the words as a bonus, the filters; the service calls the AI only when `meaning=yes` and there are words;
  - the **AI module** (`ai.service.spec.ts`, `gemini.provider.spec.ts`): the choice of provider, 503 without a key or on failure (the provider's message is not shown), the request sent to Gemini (key in a header, 768 numbers, task), retries after a 503, no retry after a 403, a wrong vector size refused. **No test calls a real AI**: `fetch` and `AiService` are faked;
  - the service (the "closest documents" fallback), the error filter, the settings, the number pipe, Israel's date.
- **Server end-to-end**: the whole application over the real data: the list, search, the questions, the filters, one document, 400 for a bad query, 404 in JSON, headers, CORS read-only, the chapters (chapter 10 included), `/health`.
- **Web unit and component**: the pages over a fake API (`tests/support/fake-api.ts`, which works like the server in spirit): the home page (welcome, chapters, search), the filters in the order of the official site, the tree (closed chapters, the selected one open) and the ranked list, the "closest documents" notice, empty, error and retry, the selected document (the order of the facts, description, keywords, 404), the theme button; the API client (non-JSON answers, status 0, abort); the **design tokens** (every text pair AA in both themes; no hex color outside `tokens.css`).
- **Web end-to-end** (`e2e/tests/home`, `browse`, `theme`, `accessibility`): the real server (its database in memory, on its own port) and the real build, in a phone and a desktop viewport. They check what the project is for: **singular and plural give the same answer**, **a question finds its instruction**, `H.7.1.5` and chapter 10 are found. The experiment "search by meaning" is covered with the server's answer faked for the success case, and the real server **without a key** (`GEMINI_API_KEY` is emptied in `playwright.config.ts`) for the 503 case. They include the **axe accessibility check in both themes** on the home page, the list, a document, the ranked results and the empty state, a theme that opens light whatever the system prefers and is remembered, and a keyboard path. A page that writes to the console fails its test (`e2e/fixtures.ts`).

## Coverage

`pnpm test:coverage` runs the server tests (Jest, istanbul) and the web tests (Vitest, v8) with a report. Measured on 2026-11-11 (the end-to-end tests of Playwright are not counted):

| | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| Server | 99.0 % | 87.1 % | 100 % | 100 % |
| Web | 97.9 % | 93.7 % | 96.7 % | 98.8 % |

It is high, **not perfect**, and it is not claimed to be. The bars (`coverageThreshold` in `apps/server/jest.config.js`, `coverage.thresholds` in `apps/web/vite.config.ts`) sit a little under the measured figures, and the pipeline runs the tests with them: a change that lowers the coverage fails the build. Most of what is left uncovered is a defensive branch.

## The pipeline (`.github/workflows/ci.yml`)

**One road to production, through GitHub.** Nobody deploys from a laptop and Vercel does not build by itself (it is not connected to the repository).

| Job | When | What |
|---|---|---|
| 1. `checks` | every push and pull request | lint, type-check (server and web), build, the server tests and the web tests with the coverage bars |
| 2. `e2e` | after 1 | Playwright on the builds, phone and desktop, with the axe checks |
| 3. `deploy` | **only a push to `main`**, after 1 and 2 passed (and on a manual run of the workflow) | the API (built in `apps/server`, deployed from the root), then the web app, on Vercel, with the `VERCEL_TOKEN` secret and the project ids kept as repository variables |
| 4. `smoke` | after 3 | `scripts/smoke-test.mjs` on the **live** site: the API is up and loaded, the search by words and by meaning (the AI key works), `H.7.1.5`, a question, an empty answer, the attached messages, the file link (302 to the Takam site), a 404, CORS from the web app, the web app and a deep link |

A failing check stops everything after it: nothing is deployed from a red build. If job 4 fails, the deploy is already live: look at the failing line and fix forward (or redeploy the previous commit from the Actions tab). The daily reading of the site (`refresh-data.yml`) commits new data and then starts this same pipeline: it never deploys by itself.

## Rules

- Arrange, Act, Assert. Each test is independent and deterministic: the network is faked (component tests) or the real local server (e2e); dates are passed to the SQL, never read from the clock inside it.
- E2E: `getByRole` only, Page Objects in `e2e/pages/`, no `sleep`. A test that expects a console error (a 404 is logged by the browser) says so: `test.use({ expectedConsoleErrors: [...] })`.
- The e2e servers use **their own ports** (API 3199, web 4173) and never reuse a server that is already running: `pnpm dev` (3100 and 5173) is left alone.
- Jest runs with `--experimental-vm-modules` (PGlite uses dynamic imports); the scripts of `apps/server/package.json` do it.
- Playwright is pinned to `1.64.1`, with `playwright-core` at the same version (`@axe-core/playwright` would otherwise bring its own, and the types of the two copies clash).

## Known gaps

No visual regression test; no test of the production CORS origin; the e2e suite does not test the dev server (`pnpm dev`), only the build; the quality of the Hebrew rules is tested on word pairs, not measured on a set of real questions.
