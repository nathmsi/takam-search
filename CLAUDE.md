# Takam Search: rules for whoever changes this code

pnpm monorepo: `apps/server` (the NestJS API over a local PostgreSQL database), `apps/web` (the React app), `packages/contracts` (the types the two share), `docs/` (the map of the project), `.github/workflows/ci.yml` (the pipeline).

## Read the docs first, and keep them true

**`docs/README.md` is the map: what each part does, where it lives and how to change it.** Read the file that matches your task before you change anything.

> **Every change updates the docs, in the same commit.** A change of a route, a field of the contract, a rule of the data, a command, an environment variable or a folder updates the file(s) of `docs/` that describe it and the README of the app it touches. **A task is not done while a doc says something the code no longer does.**

## Contracts (`packages/contracts`)
- Types only, no runtime code. The API builds these shapes, the web app reads them; change one side without the other and `pnpm typecheck` fails.
- The package is built (`dist/`) by the root `prepare` script after `pnpm install`; after a change run `pnpm --filter @takam/contracts build`.

## Server (`apps/server`): NestJS, TypeScript, rules of `nestjs-clean-typescript`
- **Keep it plain.** One folder per route (`documents/`, `chapters/`, `health/`), each with its controller, its repository and, when there is logic, its service: **controller → service → repository → database**. No ports, no ORM, no abstract classes to plug things in. A reader must be able to follow a request in four files.
- One export per file, kebab-case files, every variable and function typed, no `any`, JSDoc on public classes and methods, RO-RO (an object in, an object out) for more than two parameters, early returns, functions under 20 lines.
- **The search is SQL, in the repository** (`SEARCH_SQL`), on the cleaned columns of the table. The cleaning of Hebrew (`normalize_he()`, `search_terms()`, `has_term()`) is SQL in `src/database/schema.sql` and runs on the stored texts and on the typed words alike: never clean one side in TypeScript. The search never runs in the browser.
- **The database is PostgreSQL (PGlite)**, opened by `DatabaseService`; every query goes through `DatabaseService.query()`. Values travel as **SQL parameters** (`$1`, `$2`...), never inside the text of a query.
- The data is **two committed files** (plus `embeddings.json`, optional, made by `pnpm data:embed`) (`apps/server/data/Document.json`, `Chapter.json`: the objects of the Takam site) loaded into two tables when the database is empty (`load-data.ts`). A change of `schema.sql` or of the loader needs `pnpm db:reset` to show in a database that already exists.
- The API is **read-only**: no route writes, CORS allows `GET`, `HEAD` and `OPTIONS` only.
- Every error has the one JSON body of `AllExceptionsFilter` (`ApiErrorDto`); a bug is logged with its stack and never shown. An unknown address is a 404 in JSON, never a page with a 200. **No result is not an error** (200 with an empty list).
- "In force" is **computed from the dates** in SQL. Never store or read the `isvalid` flag of the Takam API: it means "expired" ([docs/site-audit.md](docs/site-audit.md)).
- A new environment variable is read in `settings.ts` (or `database.service.ts` for `DATABASE_DIR`, `ai/providers/*` for the AI keys) and listed in `.env.example` and in [docs/api.md](docs/api.md). `GEMINI_API_KEY` is the one secret: never commit it, never log it, never put it in an address.
- **AI lives in `src/ai/`** (module, `AiService`, one class per provider behind `AiProvider`, like `jobs-monitor-api`). Other folders ask `AiService`, never a provider or an HTTP API. Tests never call a real AI: they fake `AiService` (`createTestApp`) or `fetch`.
- **The search by meaning is an experiment** on the `documents.embedding` column (pgvector), filled from `data/embeddings.json` (`pnpm data:embed`). It is hybrid (the words keep counting), asked with `meaning=yes`, and the search by words never depends on it.
- Tests: Jest, run with `--experimental-vm-modules` (PGlite needs it; the package scripts do it). A unit test `*.spec.ts` next to the code, on the real database in memory (`test/support/create-test-database.ts`); an end-to-end test `test/*.e2e-spec.ts` per route (`test/support/create-test-app.ts`). Test the real SQL, not a copy of it.

## Web (`apps/web`): React, TypeScript, Vite
- **All text comes from `src/i18n/messages.ts`** (Hebrew, right-to-left). No text written in a component, `aria-label`s and tab titles included.
- CSS Modules only, one `Foo.module.css` per `Foo.tsx`, logical properties (`inline-start`, `block-size`) so the layout is right in RTL. No inline `style={{}}`.
- **`src/styles/tokens.css` is the ONE place of colors, radii, shadows, spacing, type and motion.** Never write a hex color anywhere else (`tokens.test.ts` fails). Every text pair stays AA (4.5:1) in the light and the dark theme (same test).
- Named exports only (`React.lazy` uses `.then((m) => ({ default: m.Foo }))`). `components/<Name>/<Name>.tsx` + `.module.css`; pages in `pages/` are the only components that read the address.
- `strict`, `verbatimModuleSyntax` (use `import type`), `erasableSyntaxOnly` (no enums, no constructor parameter properties).
- React performance (Vercel best practices): lazy state initializers, no state mirrored by effects (the one sync to the address is an external system), side effects in event handlers, `React.lazy` for heavy pages, one request cache (React Query), `content-visibility` on long lists, no barrel files.
- **The structure of the pages follows the official site** (takam.mof.gov.il), as [docs/ui.md](docs/ui.md) describes: home (welcome, search, topics, button to the whole list), then filters in their order (free text, main chapter, sub-chapter, type, validity, clear), the list and the selected document side by side, the link row and the facts in their order. Labels use the site's wording. **Never copy its logos, illustrations or icons**, and never present the app as the site.
- The state of the search lives in the **address** (`?q=&chapter=&type=&inForce=`) and the selected document in the **path** (`/documents/:codeText`, e.g. `H.1.2.1`); every link of the list keeps the filters. No `type` in the address means the instructions. A result can be shared and the back button works.
- **Two themes, light by default** (never from the system): blocks of tokens selected by `data-theme` on `<html>`, set before the first paint by `index.html`, switched by `useTheme`. Every new token exists in both blocks and every text pair stays AA in both.
- A grid that holds long text has `grid-template-columns: minmax(0, 1fr)`, or its column grows to the widest line and the page scrolls sideways on a phone.
- Never pick a state by color alone: a word and an icon say it (`StatusBadge`). Every control is at least 44 px high, has a visible focus ring and a visible label.
- Animations respect `prefers-reduced-motion` (the tokens go to 0).
- A rule of the interface that a person could break by mistake (empty state, error state, back link) has a test.

## Tests ([docs/testing.md](docs/testing.md))
- Three levels: unit (`*.test.ts`, `*.spec.ts`) and component (`*.test.tsx`) next to the code, end-to-end in `apps/web/e2e/tests/<feature>/`.
- E2E specs import `test` and `expect` from `e2e/fixtures.ts` (never from `@playwright/test`: it fails a test on any console error), drive pages through the Page Objects in `e2e/pages/`, and select by `getByRole`. No arbitrary sleep. Each test is independent.
- **Any change of a screen or of a user flow comes with an e2e test added or updated; a task is not done until `pnpm test:e2e` is green.** Accessibility (axe, both themes) is part of it.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm test:e2e` must pass before a commit.

## Git
- Format: `type(scope): message` with the types feat, fix, refactor, chore, docs, test. Docs change in the same commit as the code they describe.
- Never commit an `.env` file or a secret (none is needed to run the project).
