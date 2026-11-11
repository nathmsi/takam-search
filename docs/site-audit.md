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
| 13 | **The whole list is downloaded at every visit** (`/api/Document`, 75 KB gzipped, 1126 documents) and filtered in the browser | The network tab, the source. Here the search runs in the database, on the server |

## What was *not* verified

The menu of the tags filter was not opened on screen (its list is empty in the API and the code filters on a field that no document has). The Word files of the instructions (their text, the table of changes) were looked at during the audit but are **not used by this project**: the search covers the metadata of the site's own objects only. The effect of the defects on real users was not measured: "people lose time" is a reasonable hypothesis, not a measurement.
