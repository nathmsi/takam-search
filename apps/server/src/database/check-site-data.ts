/** What the loader needs to find in the two files of the site, and the least it must find for them to be believed. */
const LEAST_DOCUMENTS_WITH_A_CODE = 900;
const LEAST_CHAPTERS = 100;

interface SiteData {
  readonly documents: unknown;
  readonly chapters: unknown;
}

/**
 * Says what is wrong with data fetched from the Takam site, or nothing (an empty list) when it can be loaded.
 * Used before the files in `data/` are replaced: a site that answers with an error page, an empty list or other field
 * names must never wipe out the data that works.
 */
export function checkSiteData({ documents, chapters }: SiteData): string[] {
  const problems: string[] = [];
  if (!Array.isArray(documents)) return ['Document is not a list'];
  if (!Array.isArray(chapters)) return ['Chapter is not a list'];
  const withCode: number = documents.filter((document: { documentcodetext?: unknown }) => document?.documentcodetext).length;
  if (withCode < LEAST_DOCUMENTS_WITH_A_CODE) problems.push(`Only ${withCode} documents have a code (at least ${LEAST_DOCUMENTS_WITH_A_CODE} expected)`);
  if (chapters.length < LEAST_CHAPTERS) problems.push(`Only ${chapters.length} chapters (at least ${LEAST_CHAPTERS} expected)`);
  return problems;
}
