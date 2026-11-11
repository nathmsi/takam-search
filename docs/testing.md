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
  - the service (the "closest documents" fallback), the error filter, the settings, the number pipe, Israel's date.
- **Server end-to-end**: the whole application over the real data: the list, search, the questions, the filters, one document, 400 for a bad query, 404 in JSON, headers, CORS read-only, the chapters (chapter 10 included), `/health`.
- **Web unit and component**: the pages over a fake API (`tests/support/fake-api.ts`, which works like the server in spirit): the home page (welcome, chapters, search), the filters in the order of the official site, the tree (closed chapters, the selected one open) and the ranked list, the "closest documents" notice, empty, error and retry, the selected document (the order of the facts, description, keywords, 404), the theme button; the API client (non-JSON answers, status 0, abort); the **design tokens** (every text pair AA in both themes; no hex color outside `tokens.css`).
- **Web end-to-end** (`e2e/tests/home`, `browse`, `theme`, `accessibility`): the real server (its database in memory, on its own port) and the real build, in a phone and a desktop viewport. They check what the project is for: **singular and plural give the same answer**, **a question finds its instruction**, `H.7.1.5` and chapter 10 are found. They include the **axe accessibility check in both themes** on the home page, the list, a document, the ranked results and the empty state, a theme that opens light whatever the system prefers and is remembered, and a keyboard path. A page that writes to the console fails its test (`e2e/fixtures.ts`).

## Rules

- Arrange, Act, Assert. Each test is independent and deterministic: the network is faked (component tests) or the real local server (e2e); dates are passed to the SQL, never read from the clock inside it.
- E2E: `getByRole` only, Page Objects in `e2e/pages/`, no `sleep`. A test that expects a console error (a 404 is logged by the browser) says so: `test.use({ expectedConsoleErrors: [...] })`.
- The e2e servers use **their own ports** (API 3199, web 4173) and never reuse a server that is already running: `pnpm dev` (3100 and 5173) is left alone.
- Jest runs with `--experimental-vm-modules` (PGlite uses dynamic imports); the scripts of `apps/server/package.json` do it.
- Playwright is pinned to `1.64.1`, with `playwright-core` at the same version (`@axe-core/playwright` would otherwise bring its own, and the types of the two copies clash).

## Known gaps

No visual regression test; no test of the production CORS origin; the e2e suite does not test the dev server (`pnpm dev`), only the build; the quality of the Hebrew rules is tested on word pairs, not measured on a set of real questions.
