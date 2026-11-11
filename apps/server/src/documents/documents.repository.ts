import { Injectable } from '@nestjs/common';
import type { DocumentDto, DocumentSummaryDto, InForceFilter, RelatedDocumentDto } from '@takam/contracts';
import { DatabaseService } from '../database/database.service';

/** What a search is asked: the words typed, the filters, the page. */
export interface SearchRequest {
  /** Today's date (`YYYY-MM-DD`): "in force" is decided against it. */
  readonly today: string;
  /** The words typed, as typed. Empty = no words: every document that passes the filters. */
  readonly words: string;
  /** `all`: a document must have every word. `any`: it must have at least one (the closest documents). */
  readonly mode: 'all' | 'any';
  /** A chapter (`1`) or a sub-chapter (`1.2`). */
  readonly chapter: string | null;
  readonly type: string | null;
  readonly inForce: InForceFilter;
  readonly limit: number;
  readonly offset: number;
}

/** A search by meaning: the same as {@link SearchRequest}, with the embedding of the words instead of a mode. */
export type MeaningSearchRequest = Omit<SearchRequest, 'mode'> & { readonly embedding: readonly number[] };

/** One page of the answer, and how many documents match in all. */
export interface SearchPage {
  readonly items: DocumentSummaryDto[];
  readonly total: number;
}

/**
 * The columns of a line of a list, named as the API names them. $1 is today's date.
 * "In force" is not a column: it is worked out from the two dates (a missing date means "no limit").
 */
const SUMMARY_COLUMNS = `
  d.code_text AS "codeText",
  d.code,
  d.title,
  d.type,
  (coalesce(d.valid_from <= $1::date, true) AND coalesce(d.valid_to >= $1::date, true)) AS "isInForce",
  c.code AS "chapterCode",
  c.title AS "chapterTitle",
  m.code AS "mainChapterCode",
  m.title AS "mainChapterTitle"
`;

/** Every column of one document: the summary, and what only the panel of a document needs. */
const DOCUMENT_COLUMNS = `
  ${SUMMARY_COLUMNS},
  d.id,
  d.description,
  CASE WHEN btrim(coalesce(d.keywords, '')) = '' THEN ARRAY[]::text[]
       ELSE regexp_split_to_array(btrim(d.keywords), '\\s*,\\s*') END AS keywords,
  d.version,
  d.valid_from::text AS "validFrom",
  d.valid_to::text AS "validTo",
  'https://takam.mof.gov.il/document/' || d.code_text AS "officialPageUrl",
  '/v1/documents/' || d.code_text || '/file' AS "fileUrl"
`;

/** A document with its sub-chapter (c) and the chapter above it (m). */
const DOCUMENT_JOINS = `
  FROM documents d
  LEFT JOIN chapters c ON c.code = d.chapter_code
  LEFT JOIN chapters m ON m.code = c.parent_code
`;

/**
 * THE SEARCH.
 *
 * 1. The typed words ($2) are cleaned by `search_terms()`: no vowel points or quotes, no plural or feminine ending, no
 *    little words (של, מה, האם...). `קופות` and `קופת` become the same term.
 * 2. For each term we ask four questions of each document: is it in the title, in the keywords, in the description,
 *    in the number? (`has_term()`, on the cleaned columns of the table.)
 * 3. `found` = how many terms the document has somewhere. `score` = a weight for each place a term is found
 *    (title 3, number 3, keywords 2, description 1).
 * 4. A document stays if it passes the filters ($3 chapter, $4 type, $5 validity) and has all the terms ($6 = 'all') or
 *    at least one ('any').
 * 5. The best score comes first; at an equal score, the order of the numbers (1.2 before 1.10).
 */
const WORD_HITS = `
  CROSS JOIN (SELECT search_terms($2::text) AS terms) AS q
  CROSS JOIN LATERAL (
    SELECT count(*) FILTER (WHERE in_title OR in_keywords OR in_description OR in_code) AS found,
           coalesce(sum(in_title::int * 3 + in_code::int * 3 + in_keywords::int * 2 + in_description::int), 0) AS score
    FROM (
      SELECT has_term(d.title_n, term) AS in_title,
             has_term(d.keywords_n, term) AS in_keywords,
             has_term(d.description_n, term) AS in_description,
             has_term(d.code_n, term) AS in_code
      FROM unnest(q.terms) AS term
    ) AS per_term
  ) AS hits
`;

/** The filters, the same for both searches: $3 chapter, $4 type, $5 validity (with $1 = today). */
const FILTERS = `
  ($3::text IS NULL OR d.chapter_code = $3 OR c.parent_code = $3)
    AND ($4::text IS NULL OR d.type = $4)
    AND ($5::text = 'all'
         OR ($5::text = 'yes') = (coalesce(d.valid_from <= $1::date, true) AND coalesce(d.valid_to >= $1::date, true)))
`;

const SEARCH_SQL = `
  SELECT ${SUMMARY_COLUMNS}, count(*) OVER ()::int AS "total"
  ${DOCUMENT_JOINS}
  ${WORD_HITS}
  WHERE ${FILTERS}
    AND (cardinality(q.terms) = 0
         OR hits.found >= CASE WHEN $6::text = 'all' THEN cardinality(q.terms) ELSE 1 END)
  ORDER BY hits.score DESC, natural_key(d.chapter_code) NULLS LAST, natural_key(d.code) NULLS LAST, d.id
  LIMIT $7::int OFFSET $8::int
`;

/** Below this cosine similarity (0 to 1) a document is never "close in meaning" to the question. */
const MIN_SIMILARITY = 0.6;
/**
 * A document is "close in meaning" when it is within this distance of the best one. Measured on the real data: the best
 * document of a question scores 0.70 to 0.81, and a fixed bar of 0.6 let 85 to 500 of the 922 documents through.
 */
const CLOSENESS_WINDOW = 0.06;

/**
 * THE SEARCH BY MEANING (experiment: only the documents whose `embedding` is filled, see docs/data.md).
 * Same filters as above ($1 to $5). $6 limit, $7 offset, $8 the embedding of the question.
 * `similarity` = 1 - the cosine distance between the question and the document (pgvector `<=>`). A document stays if it is
 * close in meaning (at least MIN_SIMILARITY and within CLOSENESS_WINDOW of the best document) or has at least one of the typed words; the order is the similarity plus a small bonus for the
 * words (the same score as the search above), so a document that says the words AND means the same comes first.
 */
const MEANING_SQL = `
  SELECT ${SUMMARY_COLUMNS}, count(*) OVER ()::int AS "total"
  ${DOCUMENT_JOINS}
  ${WORD_HITS}
  CROSS JOIN LATERAL (SELECT 1 - (d.embedding <=> $8::vector) AS similarity) AS meaning
  WHERE ${FILTERS}
    AND d.embedding IS NOT NULL
    AND (meaning.similarity >= GREATEST(${MIN_SIMILARITY}, (SELECT max(1 - (best.embedding <=> $8::vector)) FROM documents best) - ${CLOSENESS_WINDOW})
         OR hits.found >= 1)
  ORDER BY meaning.similarity + hits.score * 0.02 DESC, natural_key(d.code) NULLS LAST, d.id
  LIMIT $6::int OFFSET $7::int
`;

/** The documents attached to a document ($2): messages, forms, temporary instructions... Oldest first, like the site. $1 is today. */
const FIND_RELATED_SQL = `
  SELECT c.code_text AS "codeText",
         c.title,
         c.type,
         c.valid_from::text AS "validFrom",
         c.valid_to::text AS "validTo",
         (coalesce(c.valid_from <= $1::date, true) AND coalesce(c.valid_to >= $1::date, true)) AS "isInForce",
         '/v1/documents/' || c.code_text || '/file' AS "fileUrl"
  FROM documents c
  JOIN documents p ON p.id = c.parent_id
  WHERE p.code_text = $2::text
  ORDER BY c.valid_from NULLS LAST, natural_key(c.code_text), c.id
`;

const FIND_SITE_ID_SQL = `SELECT site_id AS "siteId" FROM documents WHERE code_text = $1::text`;

const FIND_ONE_SQL = `SELECT ${DOCUMENT_COLUMNS} ${DOCUMENT_JOINS} WHERE d.code_text = $2::text`;

/** Every SQL query on the documents is here. */
@Injectable()
export class DocumentsRepository {
  constructor(private readonly database: DatabaseService) {}

  async search({ today, words, mode, chapter, type, inForce, limit, offset }: SearchRequest): Promise<SearchPage> {
    const rows = await this.database.query<DocumentSummaryDto & { total: number }>(SEARCH_SQL, [today, words, chapter, type, inForce, mode, limit, offset]);
    return { total: rows[0]?.total ?? 0, items: rows.map(({ total: _total, ...document }) => document) };
  }

  /** Documents ordered by how close their embedding is to the question's. Only the documents that have an embedding. */
  async searchByMeaning({ today, words, chapter, type, inForce, limit, offset, embedding }: MeaningSearchRequest): Promise<SearchPage> {
    const rows = await this.database.query<DocumentSummaryDto & { total: number }>(MEANING_SQL, [today, words, chapter, type, inForce, limit, offset, `[${embedding.join(',')}]`]);
    return { total: rows[0]?.total ?? 0, items: rows.map(({ total: _total, ...document }) => document) };
  }

  /** The documents attached to a document (its messages, forms...), oldest first. */
  async findRelated(today: string, codeText: string): Promise<RelatedDocumentDto[]> {
    return this.database.query<RelatedDocumentDto>(FIND_RELATED_SQL, [today, codeText]);
  }

  /** The id of a document in the site's own system, or `undefined` for a number that does not exist. */
  async findSiteId(codeText: string): Promise<string | undefined> {
    const rows = await this.database.query<{ siteId: string }>(FIND_SITE_ID_SQL, [codeText]);
    return rows[0]?.siteId;
  }

  async findByCodeText(today: string, codeText: string): Promise<DocumentDto | undefined> {
    const rows = await this.database.query<DocumentDto>(FIND_ONE_SQL, [today, codeText]);
    return rows[0];
  }
}
