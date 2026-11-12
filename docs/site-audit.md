# Defects found in the Takam site and its API

Found on 2026-11-11 by using the site (`takam.mof.gov.il`, an Angular app over a JSON API), reading its source and calling its public API (1126 documents, 114 chapters). Each line says how it was seen and how this project deals with it.

## The problem this project is about

A person with a concrete situation ("what do I do if the budget is exceeded?") cannot reliably get to the rule that applies. In the source of the site (`filterByFreeTxt`) the free text is matched against four fields only (title, description, keywords, number) with a plain "contains": a word must be written the same way as in the title.

Observed on the site (the figures come from running the site's own logic on its data):

| You type | What the site does |
|---|---|
| `קופת ביטחון` then `קופות ביטחון` | 2 then 4 results: the singular does not find the plural |
| `התחייבות` then `התחייבויות` | 11 then 5 results |
| `מקדמות ללא התחייבות` | 0 results, although the instructions on advances (1.4.5) and on payments without commitments (1.5.1) exist: the title of the second says `התחייבויות` |
| `מה עושים כשיש חריגה` | 0 results (a question is not a title) |
| a word with no result | the address becomes `/document/undefined` and the details panel stays empty, with no help |

## Defects of the search and of the data

| # | Defect | How it was seen | Here |
|---|---|---|---|
| 1 | **Singular and plural are different words**, quotes inside a word matter (`דו"ח`, `דוח`) | See the table above | Both sides are cleaned by the SQL function `normalize_he()`: same endings, same prefixes, same quotes |
| 2 | **A question finds nothing**: every word must match | `מה עושים כשיש חריגה` | The little words are dropped (`search_terms()`); when no document has every word, the closest ones are shown and the answer says so (`relaxed`) |
| 3 | **A search with no result breaks the page** (`/document/undefined`) | The code builds the address by writing `"/document/" + code` of the selected node, and there is none | An empty answer is a normal answer: the address stays valid and the page offers to clear the filters |
| 4 | **A whole chapter is missing from the filter.** "ניהול מלאי ומצאי" (chapter 10, 21 instructions) is not in `/api/Chapter` | `H.10.2.1` typed on the site: "לא נמצאו רשומות"; the list of main chapters jumps from 9 to 11 | Chapter 10 and its sub-chapters are recreated from the documents' own fields (`load-data.ts`) |
| 5 | **11 instructions are not shown by the site** (`7.1.2`, `7.1.4`, `7.1.5`, `7.6.3`, `7.6.9`, `7.12.2`, `7.12.3`, `7.12.4`, `6.2.3`, `11.0.3`, `11.1.5`): the fields the site displays for the chapter are empty, so they are not in its tree and a search by their own number finds nothing (tried with `H.7.1.5`) | `firstnamechapter` empty in `/api/Document` | **Probably on purpose, for 7 of them**: their description says they were merged or renumbered (`7.1.2`, `7.1.4`, `7.1.5`: "אוחדה עם הוראה 7.1.1"; `7.6.3`, `7.6.9`: "אוחד עם הוראה 7.6.1"; `7.12.2`: "העברת ההנחיות להוראה 7.12.1"; `11.1.5`: "שינוי מס' ההוראה למס' 11.2.2"). The other 4 say nothing. Their data is complete (a sub-chapter in `relatedtochapter`, published, no end date). Here they are kept, with their chapter, and their description is shown: a person who types the old number finds where it went. They count as "in force" because the data gives no end date, which is wrong for a merged instruction (open question) |
| 6 | **The flag `isvalid` is inverted**: `true` for the 51 *expired* documents, `false` for all the others. The site hides it by writing `isvalid == 1 ? "לא" : "כן"` | All 51 documents with `isvalid=true` have an end date in the past, and no other | Not stored. "In force" is worked out from the dates, in SQL |
| 7 | **The tags filter is dead**: `/api/Tag` is `[]` and no document has a tag | The network tab, the source | Not offered |
| 8 | **The 9 temporary instructions have no chapter** of their own | `firstnamechapter` empty | Not a defect: the site shows them under their parent instruction. Here a form, a message or a temporary instruction takes the chapter of its parent |

## Defects of the API

| # | Defect | How it was seen |
|---|---|---|
| 9 | **A wrong file id answers `503` with an HTML body**, not a 404 with JSON | `GET /api/DocumentSF/DownloadDocument/<bad id>/x` |
| 10 | **An unknown address answers `200` with the home page** (`/api/NoSuchThing`), and an unknown version id answers `[]` with 200 | `curl`. Our API answers 404 in JSON, and the web client refuses a non-JSON answer even with a 200 |
| 11 | **The Word files are served as `application/octetstream`**, a type that does not exist | Response headers |
| 12 | **The API announces writes it should not**: `access-control-allow-methods: GET, POST, OPTIONS, PUT, PATCH, DELETE` with `allow-credentials: true`, and contradictory headers (`x-frame-options: SAMEORIGIN` and `DENY`). Only `GET` and `OPTIONS` were used; no write was tried | Response headers. Our API is read-only and CORS allows `GET`, `HEAD`, `OPTIONS` (tested) |
| 13 | **The whole list is downloaded at every visit** (`/api/Document`, 75 KB gzipped, 1126 documents) and filtered in the browser | The network tab, the source. Here the search runs in the database, on the server. Explained with the next three in [the four problems below](#the-four-problems-of-how-the-site-loads-its-data) |

## The four problems of how the site loads its data

Measured on 2026-11-11 with `curl` (headers, sizes, timings) and with the network tab while using the site. These are observations of the API's behaviour, not of its code, which I have not seen. For each: what happens, why it is a problem, what this project does instead.

### Problem 1: one call brings everything, and it ignores what you ask

- **What happens.** `GET /api/Document` answers with all 1126 documents: **875,738 bytes** (75 KB once gzipped). Adding a parameter changes nothing: `?search=עיקול` returns the same 875,738 bytes. The home page already makes this call before anyone has typed a word.
- **Why it is a problem.** The server cannot search, so the browser must: it downloads everything to show ten rows, then filters with a plain "contains" (the cause of problems 1 and 2 above). A smarter search (plural, a question, meaning) cannot exist while the list is filtered in the browser. The answer also grows with every new instruction.
- **Here.** The search is SQL on the server and the browser asks for one page: the list answers with **9 fields per document** (a summary), and the full document (description, keywords, version, dates, file, related documents) is sent only for the one that is opened (`GET /v1/documents/:codeText`).

### Problem 2: no cache, so the same data is downloaded again and again

- **What happens.** The answer has **no `Cache-Control` and no `ETag`**, and the CDN in front of it reports `x-sucuri-cache: EXPIRED`. In one visit the same 75 KB list (and `Chapter`, `Tag`, `docType.json`) was downloaded **twice**: once on the home page, once when moving to the list.
- **Why it is a problem.** These data change rarely (the list is the same from one minute to the next), yet each page, each visit and each person pays the full download. On a phone or a slow office network, it is time spent waiting for something already received.
- **Here.** The web app has a request cache (TanStack Query): a list or a document already asked is not asked again for 5 minutes, and the chapters are asked once per visit. The data itself is read once from the site into our database (`pnpm db:push`), not at every visit.

### Problem 3: opening an instruction makes three calls, one after the other, that could be one

- **What happens.** Selecting an instruction calls `/api/DocumentVersion/<id>`, then `/api/DocumentVersion/RelatedDocumentId/<id>`, then `/api/DocumentVersion/DocumentAttached/<id>`. Each starts only after the previous one (about **80 ms apart**, measured: three calls in a row take about a quarter of a second before the details are complete). Each answer is tiny (300 bytes to 1.3 KB): the cost is the three round trips, not the size.
- **Why it is a problem.** The three answers belong to the same document, whose id the browser already has from the big list. Nothing in the second call depends on the first, so they could be one answer sent with the document. The details panel waits for the slowest link of a chain that did not need to be one, and the server does three lookups where one would do.
- **Here.** **One call** per opened instruction (`GET /v1/documents/:codeText`): the document and its **related documents** (messages, forms, temporary instructions) come together, from one SQL query on our own table. The only call that goes to the Takam site is the file to download, and only when someone clicks the download link (`GET /v1/documents/:codeText/file`, a redirect to the site's file), never when a document is simply opened.

### Problem 4: calls whose answer is empty

- **What happens.** `/api/Tag` is called at every page load and answers `[]` (2 bytes), because no document has a tag. For many instructions `RelatedDocumentId/<id>` and `DocumentAttached/<id>` also answer `[]`.
- **Why it is a problem.** Each is a full round trip, with its headers, for nothing to show. A "tags" filter exists on the screen but has no data behind it (defect 7).
- **Here.** No tag call and no tag filter. The related documents are part of the document's own answer, so an instruction with none costs no extra request.

## What was *not* verified

The menu of the tags filter was not opened on screen (its list is empty in the API and the code filters on a field that no document has). The Word files of the instructions (their text, the table of changes) were looked at during the audit but are **not used by this project**: the search covers the metadata of the site's own objects only. The effect of the defects on real users was not measured: "people lose time" is a reasonable hypothesis, not a measurement.
