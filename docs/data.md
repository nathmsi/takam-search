# Data

## Where it comes from

The Takam site itself: its API gives two lists, and nothing of them is kept in the repository.

| Route | What | Rows |
|---|---|---|
| `GET /api/Document` | every document of the site | 1126 (922 have a number and are kept) |
| `GET /api/Chapter` | the chapters (15) and sub-chapters (99) | 114 (122 chapters in the database: the site does not list chapter 10 and some others, they are recreated from the documents) |

`src/database/fetch-site-data.ts` reads them (the site refuses a request without a `User-Agent`; it sends `takam-search`; `TAKAM_API_URL` changes the address) and **refuses an answer that looks wrong**: not a list, fewer than 900 documents with a number, fewer than 100 chapters (`checkSiteData`), or an HTTP error. A bad answer never replaces data that works.

Nothing else is kept: no Word file, no text of the instructions, no versions (an earlier version of the project read them; it was removed on purpose). The tests do not ask the site: they read a saved copy of the two answers in `apps/server/test/fixtures/` (see [testing.md](testing.md)); `TAKAM_DATA_DIR` names that folder.

## What the server does with them

When the server starts, `src/database/database.service.ts` opens its database, runs `schema.sql`, and **if the tables are empty** fills them with `src/database/load-data.ts`. (With `DATABASE_URL` set it does none of this: it connects to the remote database, which `pnpm db:push` filled, see [the remote database](#the-remote-database).) The database is PostgreSQL itself, running inside the server (PGlite): nothing to install. It lives in `apps/server/.pgdata/` (created at the first start, about 40 MB, not committed); `pnpm db:reset` deletes it so the next start rebuilds it.

## Keeping the data up to date

**By hand, when the site has changed:** `pnpm db:push` (needs `DATABASE_URL`, see [the remote database](#the-remote-database)). There is no daily job and no data file to commit: the database is the one place of the data.

- Locally, without `DATABASE_URL`, the first start of the server reads the site once and fills `apps/server/.pgdata/` (a few seconds, it needs the network); `pnpm db:reset` forgets it so the next start reads the site again.
- Without `DATABASE_URL` on Vercel the API would read the site at every cold start (slow, and the site must be up): that is why the production API has `DATABASE_URL`.

## The file of a document (Word)

The Word files are **not stored** (the project searches the metadata only). The document panel has a link "הורדת קובץ ההוראה" to `GET /v1/documents/:codeText/file`; at the click the server asks the site `GET /api/DocumentVersion/<site_id>` (all the versions of the document), takes the file of the last published, not archived version, and answers `302` to `/api/DocumentSF/DownloadDocument/<file id>/x` on the site, which sends the file (`TakamSiteClient`). The site refuses a request without a `User-Agent`; the client sends `takam-search`. `TAKAM_API_URL` changes the address of the site's API (default `https://takam.mof.gov.il/api`). The file id is checked (15 to 18 letters and digits) before it goes in the address.

## Embeddings (experiment)

The vectors live **in the database only** (`documents.embedding`, pgvector, 768 numbers), nowhere in git. `pnpm data:embed` (`scripts/embed-documents.ts`, needs `GEMINI_API_KEY` and `DATABASE_URL`) gives a vector to every document of the remote database that has none (`--force` makes them all again): it asks Gemini (`gemini-embedding-001`, task "document") for the embedding of **title + description + keywords** only, the fields of the site's own objects, not the Word files, 50 documents per request, and waits 30 seconds when Gemini limits the requests per minute. It never writes the keys. The question typed by a person is embedded at request time (task "query"). Embedding the full text of the documents would be a later step with the same column.

`pnpm db:push` keeps the vector of every document that is already in the database, even when its text changed (for now): a new document has no vector until `pnpm data:embed` is run, and the search by words still finds it (the search by meaning is hybrid). A local PGlite has no vectors: the search by meaning is a feature of the remote database.

## The tables (`schema.sql`)

`chapters` (122 rows)

| Column | |
|---|---|
| `code` | primary key: `1` or `1.2` |
| `title` | |
| `parent_code` | the chapter of a sub-chapter; empty for a chapter |

`documents` (922 rows)

| Column | |
|---|---|
| `id` | the id of the document on the site |
| `site_id` | the id of the document in the site's own system (`sfid`): the server asks the site for the file with it, see below |
| `code_text` | `H.1.2.1` (unique): also the end of the address of its page on the site |
| `code` | `1.2.1` |
| `title`, `description`, `keywords` | as the site writes them |
| `type` | `Instruction` 418, `Form` 243, `Message` 120, `Tender Notice` 76, `Tender Details` 33, `Tender Maintenance` 23, `Temporary Instruction` 9 |
| `version`, `valid_from`, `valid_to` | the version, and the dates: an empty end date means no end |
| `chapter_code` | its sub-chapter (`1.2`) |
| `parent_id` | a form, a message or a temporary instruction belongs to an instruction |
| `embedding` | **pgvector** `vector(768)`: the meaning of the document as 768 numbers (Gemini), or `NULL` when it was not embedded (today all 922 are) |
| `title_n`, `keywords_n`, `description_n`, `code_n` | the same texts cleaned by `normalize_he()`, kept up to date by the database itself: **these are what the search reads** |

## What the loader decides

- **Only the 922 documents that have a number are kept.** The other 204 are files attached to a form (and one summary): nobody looks for them.
- **The sub-chapter is read from `relatedtochapter`**, the field the site fills for every document, before the display fields (`firstnamechapter`...) that it leaves empty for 11 instructions.
- **Chapter 10 is recreated.** The site lists it nowhere, but 21 instructions say they belong to it: the chapter and its sub-chapters (8 rows) are rebuilt from the names the documents carry.
- **A child takes the chapter of its parent** (a form, a message, a temporary instruction).
- **`isvalid` is not stored.** It means "expired" ([site-audit.md](site-audit.md)); "in force" is worked out from `valid_from` and `valid_to` and today's date, in SQL.
- The invisible direction marks the site puts in its texts are removed.

After the load, 418 of 418 instructions have a sub-chapter, and so do 241 of 243 forms, 119 of 120 messages and all the tender notices and temporary instructions.

## The SQL functions (`schema.sql`)

| Function | What it does |
|---|---|
| `normalize_he(text)` | Makes Hebrew comparable: no vowel points, quotes inside a word removed (`דו"ח` = `דוח`), anything that is not a letter, a digit or the dot of a number becomes a space, a plural or feminine ending is cut (`ים ות ית ה ת י`, so `קופות` = `קופת`, `התחייבויות` = `התחייבות`), a one-letter prefix is cut (`ה ב ל כ ש`, and `ו` before another prefix). The same function runs on the stored texts and on the words typed |
| `search_terms(text)` | The words of a search after `normalize_he()`, without the little words (`של`, `את`, `מה`, `האם`, `כשיש`...) |
| `has_term(text, term)` | Does a cleaned text contain the term at the **start of a word**, with or without a `ו` in front? (`ועד` is in `ועדת`, not in `מועד`) |
| `natural_key(code)` | `1.10.2` as numbers `{1,10,2}`, so `1.2` sorts before `1.10` |

These are rules, not a dictionary: they are right most of the time and wrong in the same way on both sides. Known limits: a root that starts with `ב`, `ל`, `כ`, `ש` or `ה` can lose it (`ביטחון` becomes `יטחון`), which is harmless because the document is cleaned the same way; two unrelated words can share a stem; a synonym is not a match in the search by words (the experiment of the search by meaning is there for that).

## Looking at the data

```bash
pnpm db:query "SELECT type, count(*) FROM documents GROUP BY type"
pnpm db:query "SELECT code_text, title FROM documents WHERE chapter_code = '1.4' ORDER BY natural_key(code)"
pnpm db:query "SELECT search_terms('מה עושים כשיש חריגה')"
```

`db:query` runs the query on a fresh copy of the database built from the saved answers of the site in `test/fixtures` (about two seconds), so it never touches the database of a running server.

## The remote database

With `DATABASE_URL` set, the API reads a PostgreSQL on Supabase instead of building PGlite at every start (the cold start of an instance falls from several seconds to the time of a connection). The project is shared with other apps, so **everything of ours is in the schema `takam_poc`** and nothing is created in `public`; `vector` (pgvector) is installed in the schema `extensions`.

- `pnpm db:push` (`scripts/push-database.ts`, about 40 seconds from a laptop in France) drops our two tables, rebuilds them from `schema.sql` and fills them with `loadData` (the same loader as PGlite, the documents in one query), all in one transaction: the API waits a few seconds, then sees the new data, never a half filled database, and a failure keeps the old data. The schema `takam_poc` must exist and be usable (`USAGE`, `CREATE`) by the user of `DATABASE_URL`, who also needs `USAGE` on `extensions` to see the `vector` type; the table names in the script carry the schema so a bare name can never reach a table of another app. It reads the site first: if that fails, nothing is touched. The pipeline does not run it (the data is not part of a release): run it by hand.
- The API opens a read-only transaction per query and sets `search_path` with `SET LOCAL`, because the pooler (transaction mode) may give the next query another connection. The certificate of the pooler is not verified (the traffic is encrypted; a proof of concept).
- The pooler of the project is in `ap-northeast-2` (Seoul): `apps/server/vercel.json` runs the API in the same region (`icn1`) so the database is a few milliseconds away; the distance is paid once, between the browser and the API.
