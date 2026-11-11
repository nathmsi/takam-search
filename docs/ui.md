# The interface

The pages follow the **order of the official site** (takam.mof.gov.il), so that its users know where they are. Only the order and the layout are followed: the site's logos, illustrations and icons are not copied (the drawing on the home page is our own), and the name on the page is this project's.

## Pages

| Address | Page | Order of things (right to left) |
|---|---|---|
| `/` | Home (`HomePage`) | The band at the top; a slanted deep-blue panel with the welcome and a drawing; on the other side the search field, "topics" (the 16 chapters, as white squares with their number, name and number of documents) and a dark button to the whole list |
| `/documents` | Search (`BrowsePage`), nothing selected | The band of filters; below, on the reading side the **list** (a tree of chapters, or the ranked results when words are typed), on the other side the details of the selected document ("pick a document") |
| `/documents/:codeText` | Search, one document selected (`/documents/H.1.2.1`) | The same, with the document opened |
| any other | Not found | A message and a way back |

### The band of filters

Free text, main chapter, sub-chapter, type of information, validity, and "clear search", in the order of the official site. The site also offers "tags": its list is empty in the API, so it is left out. **On a wide screen, a search or a choice of chapter opens its first result by itself** (the best match when there are words: the server ranks the results): each new search (new words or filters, or a chapter chosen from the home tiles) opens its first result, **even when another document is open** (`pickBestMatch` and a ref of the handled search in `BrowsePage.tsx`, address replaced so back still works). A document opened from a shared address, or by a click in the list, stays. On a phone nothing opens by itself, because opening a document hides the list. An experiment: a small sparkle button **in the header**, on the search pages only (`MeaningToggle`: "search by meaning", sets `?meaning=yes`, `aria-pressed`, icon only, its name on hover), kept out of the way on purpose. When on, the list says it comes from the search by meaning; if the server has no AI key, the usual error state shows and turning it off brings the list back. **Under the facts, description and keywords, the documents attached to the document** are listed by kind (messages "הודעות", forms, temporary instructions...), oldest first, as on the official site: a title (a link to that document), its state, its start and end dates, and an icon link to its file. The row under the title has the link to **the file** ("הורדת קובץ ההוראה", through the API, which sends the person to the site's download) and the link to the page of the document on the official site. **The type defaults to "instruction"** (the site's own tree shows instructions and tender notices); choosing "all" shows the 922 documents.

### The list

- **Without words**: the tree of the official site (chapter, sub-chapter, document), with the total and the "expand / collapse" buttons. With several chapters they start closed, except the one of the selected document.
- **With words**: the server's ranked answer, best match first: the number, the kind, the status and the place of each document. When no document has every word, a notice says that these are the closest ones.
- **Nothing found**: a message that keeps the address valid and offers to clear the filters.

### The details of a document

In the order of the official site: `הוראה מספר 1.2.1 – title` with its status, the link to its page on the site, then the facts: main chapter, sub-chapter, kind, in force, since, until, version. After them, when the document has them, its description and its keywords. (The description of a merged instruction says where it went: `H.7.1.5` says "merged with 7.1.1".)

### On a phone

One thing at a time: the list, or the document chosen from it (with a "back to the list" link that keeps the filters). On a desktop both are visible, the list stays in view while the document scrolls.

## Themes

**Light is the default**, whatever the system prefers (the official site is light). A button in the band switches to **dark**; the choice is kept in this browser (`localStorage`, key `takam-theme`) and a small script in `index.html` puts it on the page before the first paint, so there is no flash. The themes are two blocks of tokens selected by `data-theme` on `<html>`.

## Where it lives

| What | Where |
|---|---|
| Home | `src/pages/HomePage.tsx`, `components/TopicTile`, `components/HeroArt` |
| Search | `src/pages/BrowsePage.tsx`, `components/FilterBar`, `components/TreeList`, `components/ResultList`, `components/DocumentPanel` |
| The band, the theme button | `components/AppHeader`, `components/ThemeToggle`, `hooks/useTheme.ts` |
| Text | `src/i18n/messages.ts` (the labels of the filters and of the details use the wording of the official site) |
| Colors, spacing, type, motion; both themes | `src/styles/tokens.css` |

## State

The filters live in the **address** (`?q=&chapter=&type=&inForce=&meaning=`), the selected document in the **path**. Every link of the list carries the filters, so a click never loses the search, a view can be shared, and the back button works. No `type` in the address means the instructions.
