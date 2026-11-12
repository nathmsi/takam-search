import { join } from 'node:path';
import * as fetchModule from './fetch-site-data';
import { getSiteData } from './get-site-data';

describe('getSiteData', () => {
  const before: string | undefined = process.env.TAKAM_DATA_DIR;
  afterEach(() => {
    if (before === undefined) delete process.env.TAKAM_DATA_DIR;
    else process.env.TAKAM_DATA_DIR = before;
    jest.restoreAllMocks();
  });

  it('reads the saved answers of the site when TAKAM_DATA_DIR names a folder, without asking the site', async () => {
    process.env.TAKAM_DATA_DIR = join(__dirname, '..', '..', 'test', 'fixtures');
    const fetchSite = jest.spyOn(fetchModule, 'fetchSiteData');

    const data = await getSiteData();

    expect(data.documents.length).toBeGreaterThan(900);
    expect(data.chapters.length).toBeGreaterThan(100);
    expect(fetchSite).not.toHaveBeenCalled();
  });

  it('asks the site itself otherwise', async () => {
    delete process.env.TAKAM_DATA_DIR;
    const fetchSite = jest.spyOn(fetchModule, 'fetchSiteData').mockResolvedValue({ documents: [], chapters: [] });

    expect(await getSiteData()).toEqual({ documents: [], chapters: [] });
    expect(fetchSite).toHaveBeenCalledTimes(1);
  });
});
