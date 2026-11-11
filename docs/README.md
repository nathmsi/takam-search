# Documentation map

| File | Read it when you… |
|---|---|
| [architecture.md](architecture.md) | want to know how the parts fit together, and why |
| [data.md](data.md) | touch the data: the two tables, the loader, the SQL functions that clean Hebrew |
| [api.md](api.md) | call or change a route of the API, or want the exact rules of the search |
| [ui.md](ui.md) | change a page, a filter, the theme, or want to know in what way the interface follows the official site |
| [site-audit.md](site-audit.md) | want the defects found in the Takam site and its API (and how each one is handled here) |
| [testing.md](testing.md) | write or run a test |

Where things are in the code:

| Part | Folder |
|---|---|
| The database: schema, SQL functions, loading | `apps/server/src/database/` |
| The route `/v1/documents` and its SQL | `apps/server/src/documents/` |
| The route `/v1/chapters` and its SQL | `apps/server/src/chapters/` |
| The route `/health`, the error body, the settings | `apps/server/src/health/`, `src/errors/`, `src/settings.ts` |
| The two objects of the site | `apps/server/data/` |
| The pages and components (home, search, list, details, theme) | `apps/web/src/pages/`, `apps/web/src/components/` ([ui.md](ui.md)) |
| The text of the interface, the tokens | `apps/web/src/i18n/messages.ts`, `apps/web/src/styles/tokens.css` |
| The shared types | `packages/contracts/src/index.ts` |
| The pipeline | `.github/workflows/ci.yml` |

Commands (from the root): `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm db:reset`, `pnpm db:query "SELECT …"`.
