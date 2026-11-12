/** A chapter as `GET /api/Chapter` of the Takam site gives it (only the fields we read). */
export interface SiteChapter {
  readonly sfid: string;
  readonly name: string;
  readonly rtn_codetext__c: string;
  readonly rtn_chaptertype__c: 'Main' | 'Secondary';
  readonly rtn_parentchapter__c: string | null;
}
