import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SiteData } from './site-data';

/** Reads `Document.json` and `Chapter.json` (the answers of the site, saved as they were) from a folder: the data of the tests. */
export function readSiteDataFiles(directory: string): SiteData {
  const read = <T>(fileName: string): T => JSON.parse(readFileSync(join(directory, fileName), 'utf8')) as T;
  return { documents: read('Document.json'), chapters: read('Chapter.json') };
}
