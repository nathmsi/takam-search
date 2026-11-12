import type { SiteChapter } from './site-chapter';
import type { SiteDocument } from './site-document';

/** The two answers of the Takam site that the database is built from. */
export interface SiteData {
  readonly documents: SiteDocument[];
  readonly chapters: SiteChapter[];
}
