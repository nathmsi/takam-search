# API

Base address in development: `http://localhost:3100` (set `PORT`). Everything is `GET`. The interactive description is at `/docs` (Swagger). The types of the answers are in `packages/contracts/src/index.ts`.

| Route | Answer |
|---|---|
| `GET /health` | `HealthDto`: the server is up, and how many rows the database holds. Outside the `/v1` prefix |
| `GET /v1/documents` | `DocumentListDto` `{ total, items: DocumentSummaryDto[], relaxed, meaning, meaningUnavailable }`: a line of the list is only a `DocumentSummaryDto` (9 fields: `codeText`, `code`, `title`, `type`, `isInForce`, the two chapters with their titles); the description, keywords, dates and links come with one document (`DocumentDto`, below) |
| `GET /v1/documents/:codeText/file` | `302` to the download of the Word file on the Takam site (`/api/DocumentSF/DownloadDocument/<file id>/x`). The server asks the site for the last published version of the document at the click; nothing is stored. `404` (JSON) for an unknown number or a document the site has no file for, `503` when the site cannot be reached |
| `GET /v1/documents/:codeText` | One `DocumentDetailDto`, by its number (`H.1.2.1`): the `DocumentDto` and `related`, the documents attached to it (its messages, forms, temporary instructions...), oldest first |
| `GET /v1/chapters` | `ChapterDto[]`: the chapters and sub-chapters with their number of documents |

## `GET /v1/documents` parameters

| Parameter | Meaning | Default |
|---|---|---|
| `q` | The words to look for (max 200 characters): in the title, the keywords, the description and the number. Singular and plural, with or without quotes, are the same word; the little words (`מה`, `האם`...) are ignored. `1.4.3` and `H.1.4.3` both find the number | none: every document |
| `chapter` | A chapter `1` or a sub-chapter `1.4` | all |
| `type` | One kind: `Instruction`, `Temporary Instruction`, `Message`, `Form`, `Tender Notice`, `Tender Details`, `Tender Maintenance` | all kinds |
| `inForce` | `yes`, `no` or `all`, from the dates and today (Israel time) | `all` |
| `meaning` | `yes`: **experiment**, also find documents close in meaning to `q` (see below) | `no` |
| `limit` | 1 to 1000 | 50 |
| `offset` | 0 or more | 0 |

**How the words are used.** A document is kept when it has **every** word (each word anywhere in its title, keywords, description or number). If no document does, the answer holds the documents that have **some** of the words and says so: `relaxed: true`. The best match comes first (a word in the title or the number counts 3, in the keywords 2, in the description 1), and at an equal score the order of the numbers (1.2 before 1.10). Without words, the order is the order of the numbers. The SQL is `SEARCH_SQL` in `src/documents/documents.repository.ts`.

**Search by meaning (experiment, `meaning=yes` with `q`).** `AiService` turns the words into an embedding (Gemini, 768 numbers) and `MEANING_SQL` compares it with the column `documents.embedding` (pgvector, cosine distance `<=>`). Only the documents that have an embedding take part (today: all 922). A document is kept if it is close in meaning (similarity at least 0.6 **and** within 0.06 of the best document, measured on the real data) **or** it has one of the words; the order is the similarity plus a small bonus for the words. The answer says `meaning: true`; `relaxed` is `false`. **When the AI cannot answer** (no Gemini key, quota spent, Gemini down), the search does not fail: it falls back on the search by words and answers `200` with `meaning: false` and `meaningUnavailable: true` (the failure is logged by `AiService`, the provider's message is never shown). Without `q`, `meaning` is ignored.

`total` counts all the matches, before `limit` and `offset` (it is 0 when `offset` is past the end).

## `GET /v1/chapters` parameters

| Parameter | Meaning | Default |
|---|---|---|
| `type` | Count only this kind of document | all kinds |

## Errors

Every error has the same body (`ApiErrorDto`): `{ statusCode, error, message, path, timestamp }`.

| Status | When |
|---|---|
| 503 | the Takam site cannot be reached (the file download). A missing or failed AI is **not** an error: see `meaningUnavailable` |
| 400 | An unknown parameter, a value out of range (`limit=5000`), a bad `chapter`, `type` or `inForce`, a number that does not look like `H.1.2.1` |
| 404 | An unknown document, or an unknown address (in JSON, never a page with a 200) |
| 500 | A bug. The caller only reads "Internal server error"; the stack is in the log |

No result is **not** an error: `GET /v1/documents?q=zzzz` answers `200` with `{ "items": [], "total": 0, "relaxed": false, "meaning": false, "meaningUnavailable": false }`. A write (`POST`, `PUT`...) is refused: there is no such route, and CORS allows `GET`, `HEAD` and `OPTIONS` only, for the origins of `CORS_ORIGINS`. Values always travel as SQL parameters, never inside the text of a query.

## Configuration

| Variable | Default | |
|---|---|---|
| `PORT` | `3100` | Port of the API |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:4173` | Allowed browser origins, comma separated |
| `GEMINI_API_KEY` | none | **Secret.** In development put it in `apps/server/.env` (ignored by git; `pnpm dev` and `pnpm data:embed` read it). The key of the search by meaning (and of `pnpm data:embed`). Not set: the search by meaning falls back on the search by words |
| `TAKAM_API_URL` | `https://takam.mof.gov.il/api` | The API of the Takam site, asked for the file of a document (and by `pnpm data:refresh`) |
| `AI_PROVIDER` | the first provider that has a key | Forces a provider (`gemini`) |
| `DATABASE_DIR` | `apps/server/.pgdata` | Where the database lives; `memory://` keeps it in memory (the tests do) |

An invalid `PORT` stops the server at startup with a message. `GEMINI_API_KEY` is the only secret: never commit it.
