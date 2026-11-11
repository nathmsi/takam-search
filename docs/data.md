# Data

## Where it comes from

Two files in `apps/server/data/`: the objects of the Takam site, exactly as its API gave them on 2026-11-11.

| File | What | Rows |
|---|---|---|
| `Document.json` | `GET /api/Document`: every document of the site | 1126 |
| `Chapter.json` | `GET /api/Chapter`: the chapters (15) and sub-chapters (99) | 114 |

Nothing else is kept: no Word file, no text of the instructions, no versions (an earlier version of the project read them; it was removed on purpose).

## What the server does with them

When the server starts, `src/database/database.service.ts` opens its database, runs `schema.sql`, and **if the tables are empty** fills them with `src/database/load-data.ts`. The database is PostgreSQL itself, running inside the server (PGlite): nothing to install. It lives in `apps/server/.pgdata/` (created at the first start, about 40 MB, not committed); `pnpm db:reset` deletes it so the next start rebuilds it.

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
| `code_text` | `H.1.2.1` (unique): also the end of the address of its page on the site |
| `code` | `1.2.1` |
| `title`, `description`, `keywords` | as the site writes them |
| `type` | `Instruction` 418, `Form` 243, `Message` 120, `Tender Notice` 76, `Tender Details` 33, `Tender Maintenance` 23, `Temporary Instruction` 9 |
| `version`, `valid_from`, `valid_to` | the version, and the dates: an empty end date means no end |
| `chapter_code` | its sub-chapter (`1.2`) |
| `parent_id` | a form, a message or a temporary instruction belongs to an instruction |
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

These are rules, not a dictionary: they are right most of the time and wrong in the same way on both sides. Known limits: a root that starts with `ב`, `ל`, `כ`, `ש` or `ה` can lose it (`ביטחון` becomes `יטחון`), which is harmless because the document is cleaned the same way; two unrelated words can share a stem; a synonym is not a match.

## Looking at the data

```bash
pnpm db:query "SELECT type, count(*) FROM documents GROUP BY type"
pnpm db:query "SELECT code_text, title FROM documents WHERE chapter_code = '1.4' ORDER BY natural_key(code)"
pnpm db:query "SELECT search_terms('מה עושים כשיש חריגה')"
```

`db:query` runs the query on a fresh copy of the database built from `data/` (about two seconds), so it never touches the database of a running server.
