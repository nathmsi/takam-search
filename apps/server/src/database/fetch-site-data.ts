import { checkSiteData } from './check-site-data';
import type { SiteData } from './site-data';

/** The three things we use of the answer of `fetch`. Written here because the build of Vercel sees an incomplete `Response` type. */
interface HttpAnswer {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

const SITE_API: string = process.env.TAKAM_API_URL ?? 'https://takam.mof.gov.il/api';

async function download(name: string): Promise<unknown> {
  const response = (await fetch(`${SITE_API}/${name}`, { headers: { 'user-agent': 'takam-search' }, signal: AbortSignal.timeout(60_000) })) as unknown as HttpAnswer;
  if (!response.ok) throw new Error(`${SITE_API}/${name} answered ${response.status}`);
  return response.json();
}

/**
 * Reads the documents and the chapters from the Takam site (`GET /api/Document` and `GET /api/Chapter`). An answer that looks
 * wrong (an error page, an empty list, other field names) is refused with the reason: it must never replace data that works.
 */
export async function fetchSiteData(): Promise<SiteData> {
  const [documents, chapters] = await Promise.all([download('Document'), download('Chapter')]);
  const problems: string[] = checkSiteData({ documents, chapters });
  if (problems.length > 0) throw new Error(`The data of the site was not kept: ${problems.join('; ')}`);
  return { documents, chapters } as SiteData;
}
