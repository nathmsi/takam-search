import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

const SITE: string = process.env.TAKAM_API_URL ?? 'https://takam.mof.gov.il/api';
const TIMEOUT_MS = 15_000;

/** The four things we use of the answer of `fetch`. Written here because the build of Vercel sees an incomplete `Response` type. */
interface HttpAnswer {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

/** One version of a document, as `GET /api/DocumentVersion/<document>` gives it (only the fields we read). */
interface SiteVersion {
  readonly rtn_status__c?: string;
  readonly rtn_archived__c?: boolean;
  readonly rtn_versionnumber__c?: number;
  readonly rtn_contentversionid__c?: string | null;
}

/** Asks the Takam site which file holds a document. Nothing is stored: the answer is always the site's current one. */
@Injectable()
export class TakamSiteClient {
  private readonly logger: Logger = new Logger(TakamSiteClient.name);

  /**
   * The id of the file of the last published version of a document (the site downloads it at
   * `/api/DocumentSF/DownloadDocument/<id>/x`), or `null` when the site has none. 503 when the site cannot be reached.
   */
  async findFileId(siteDocumentId: string): Promise<string | null> {
    try {
      const response = (await fetch(`${SITE}/DocumentVersion/${encodeURIComponent(siteDocumentId)}`, {
        headers: { 'user-agent': 'takam-search', accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })) as unknown as HttpAnswer;
      if (!response.ok) throw new Error(`The Takam site answered ${response.status}`);
      return lastPublishedFile((await response.json()) as SiteVersion[]);
    } catch (error) {
      this.logger.error(`The Takam site failed: ${error instanceof Error ? error.message : error}`);
      throw new ServiceUnavailableException('The Takam site is not available right now');
    }
  }
}

function lastPublishedFile(versions: SiteVersion[]): string | null {
  const published: SiteVersion[] = versions.filter((version) => version.rtn_status__c === 'Published' && !version.rtn_archived__c && version.rtn_contentversionid__c);
  published.sort((a, b) => (b.rtn_versionnumber__c ?? 0) - (a.rtn_versionnumber__c ?? 0));
  return published[0]?.rtn_contentversionid__c ?? null;
}
