import { fetchSiteData } from './fetch-site-data';
import { readSiteDataFiles } from './read-site-data-files';
import type { SiteData } from './site-data';

/**
 * The data a database is built from: the Takam site itself, or, when `TAKAM_DATA_DIR` names a folder (the tests do), the two
 * files saved there, so the tests never depend on the site being up or on what it says today.
 */
export async function getSiteData(): Promise<SiteData> {
  const directory: string | undefined = process.env.TAKAM_DATA_DIR;
  return directory === undefined || directory === '' ? fetchSiteData() : readSiteDataFiles(directory);
}
