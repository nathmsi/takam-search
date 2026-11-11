# API

Base address in development: `http://localhost:3100` (set `PORT`). Everything is `GET`. The interactive description is at `/docs` (Swagger). The types of the answers are in `packages/contracts/src/index.ts`.

| Route | Answer |
|---|---|
| `GET /health` | `HealthDto`: the server is up, and how many rows the database holds. Outside the `/v1` prefix |
| `GET /v1/documents` | `DocumentListDto` `{ total, items: DocumentDto[], relaxed }` |
| `GET /v1/documents/:codeText` | One `DocumentDto`, by its number (`H.1.2.1`) |
| `GET /v1/chapters` | `ChapterDto[]`: the chapters and sub-chapters with their number of documents |

## `GET /v1/documents` parameters

| Parameter | Meaning | Default |
|---|---|---|
| `q` | The words to look for (max 200 characters): in the title, the keywords, the description and the number. Singular and plural, with or without quotes, are the same word; the little words (`מה`, `האם`...) are ignored. `1.4.3` and `H.1.4.3` both find the number | none: every document |
| `chapter` | A chapter `1` or a sub-chapter `1.4` | all |
| `type` | One kind: `Instruction`, `Temporary Instruction`, `Message`, `Form`, `Tender Notice`, `Tender Details`, `Tender Maintenance` | all kinds |
| `inForce` | `yes`, `no` or `all`, from the dates and today (Israel time) | `all` |
| `limit` | 1 to 1000 | 50 |
| `offset` | 0 or more | 0 |

**How the words are used.** A document is kept when it has **every** word (each word anywhere in its title, keywords, description or number). If no document does, the answer holds the documents that have **some** of the words and says so: `relaxed: true`. The best match comes first (a word in the title or the number counts 3, in the keywords 2, in the description 1), and at an equal score the order of the numbers (1.2 before 1.10). Without words, the order is the order of the numbers. The SQL is `SEARCH_SQL` in `src/documents/documents.repository.ts`.

`total` counts all the matches, before `limit` and `offset` (it is 0 when `offset` is past the end).

## `GET /v1/chapters` parameters

| Parameter | Meaning | Default |
|---|---|---|
| `type` | Count only this kind of document | all kinds |

## Errors

Every error has the same body (`ApiErrorDto`): `{ statusCode, error, message, path, timestamp }`.

| Status | When |
|---|---|
| 400 | An unknown parameter, a value out of range (`limit=5000`), a bad `chapter`, `type` or `inForce`, a number that does not look like `H.1.2.1` |
| 404 | An unknown document, or an unknown address (in JSON, never a page with a 200) |
| 500 | A bug. The caller only reads "Internal server error"; the stack is in the log |

No result is **not** an error: `GET /v1/documents?q=zzzz` answers `200` with `{ "items": [], "total": 0, "relaxed": false }`. A write (`POST`, `PUT`...) is refused: there is no such route, and CORS allows `GET`, `HEAD` and `OPTIONS` only, for the origins of `CORS_ORIGINS`. Values always travel as SQL parameters, never inside the text of a query.

## Configuration

| Variable | Default | |
|---|---|---|
| `PORT` | `3100` | Port of the API |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:4173` | Allowed browser origins, comma separated |
| `DATABASE_DIR` | `apps/server/.pgdata` | Where the database lives; `memory://` keeps it in memory (the tests do) |

An invalid `PORT` stops the server at startup with a message. Nothing in the project is secret.
