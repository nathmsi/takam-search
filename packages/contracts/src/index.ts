/**
 * The contract between the API and the web app. Types only: the server builds these shapes, the web app reads them.
 * (The one-export-per-file rule of the server does not apply here: this package is the entry point of the contract.)
 */

/** The kinds of document of the Takam site (the `type` column of the `documents` table). */
export type DocumentType =
  | 'Instruction'
  | 'Temporary Instruction'
  | 'Message'
  | 'Form'
  | 'Tender Notice'
  | 'Tender Details'
  | 'Tender Maintenance';

/** Which documents to keep by validity: in force today, no longer in force, or all of them. */
export type InForceFilter = 'yes' | 'no' | 'all';

/** A chapter (`1`, "Budget execution") or a sub-chapter (`1.4`, "Payments against commitments"). */
export interface ChapterDto {
  /** `1` for a chapter, `1.4` for a sub-chapter. */
  code: string;
  title: string;
  /** The chapter of a sub-chapter; `null` for a chapter. */
  parentCode: string | null;
  /** How many documents sit in it (a chapter counts those of its sub-chapters). */
  documentCount: number;
}

/**
 * A document as a list shows it: only what a line of the list needs (its number, title, kind, state and chapters). The rest
 * (description, keywords, dates, links) travels with the document alone ({@link DocumentDto}), when a person opens it.
 */
export interface DocumentSummaryDto {
  /** `H.1.2.1`: the number as the site writes it, and the end of the address of its page. */
  codeText: string;
  /** `1.2.1`. */
  code: string | null;
  title: string;
  type: DocumentType;
  /** Computed from the dates and today; never the `isvalid` flag of the Takam API (it means "expired"). */
  isInForce: boolean;
  /** The sub-chapter (`1.2`) and its title; `null` when the site does not say. */
  chapterCode: string | null;
  chapterTitle: string | null;
  /** The chapter of that sub-chapter (`1`) and its title. */
  mainChapterCode: string | null;
  mainChapterTitle: string | null;
}

/** A document with everything about it: what the panel of one document shows. */
export interface DocumentDto extends DocumentSummaryDto {
  /** The id of the document on the Takam site. */
  id: number;
  description: string | null;
  keywords: string[];
  version: number;
  /** ISO date `YYYY-MM-DD`: in force since; `null` when the site does not say. */
  validFrom: string | null;
  /** ISO date; `null` while the document has no end date. */
  validTo: string | null;
  /** The page of the document on the Takam site. */
  officialPageUrl: string;
  /** The path of the API that sends the person to the file of the document (`/v1/documents/H.1.2.1/file`). */
  fileUrl: string;
}

/** A document attached to another one: a message, a form, a temporary instruction... (as the site lists them under an instruction). */
export interface RelatedDocumentDto {
  codeText: string;
  title: string;
  type: DocumentType;
  validFrom: string | null;
  validTo: string | null;
  isInForce: boolean;
  /** The path of the API that sends the person to its file. */
  fileUrl: string;
}

/** The answer of `GET /v1/documents/:codeText`: the document and what is attached to it, oldest first. */
export interface DocumentDetailDto extends DocumentDto {
  related: RelatedDocumentDto[];
}

/** The answer of `GET /v1/documents`. */
export interface DocumentListDto {
  /** All the documents that match, before `limit` and `offset`. */
  total: number;
  items: DocumentSummaryDto[];
  /**
   * `true` when no document has all the words that were typed: the items are then the closest ones (they have some of the
   * words). `false` for a normal answer.
   */
  relaxed: boolean;
  /** `true` when the items come from the search by meaning (`meaning=yes`): only the documents that have an embedding. */
  meaning: boolean;
  /**
   * `true` when the search by meaning was asked (`meaning=yes`) but the AI could not answer (no key, quota spent, provider down):
   * the items are then the ones of the search by words, and `meaning` is `false`.
   */
  meaningUnavailable: boolean;
}

/** The answer of `GET /health`. */
export interface HealthDto {
  status: 'ok';
  service: string;
  uptimeSeconds: number;
  /** How many rows the database holds. */
  database: {
    documents: number;
    chapters: number;
  };
}

/** The body of every error of the API. */
export interface ApiErrorDto {
  statusCode: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
}
