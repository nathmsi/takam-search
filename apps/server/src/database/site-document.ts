/** A document as `GET /api/Document` of the Takam site gives it (only the fields we read). */
export interface SiteDocument {
  readonly id: number;
  readonly sfid: string;
  readonly name: string;
  readonly documenttype: string;
  readonly documentcodetext: string | null;
  readonly description: string | null;
  readonly keywords: string | null;
  readonly versionnumber: number;
  readonly datevalidfrom: string | null;
  readonly datevalidto: string | null;
  readonly mainchaptercode: number | null;
  readonly subchaptercode: number | null;
  readonly firstnamechapter: string | null;
  readonly secondnamechapter: string | null;
  readonly secondchapternumber: string | null;
  readonly relatedtochapter: string | null;
  readonly parentdocument: string | null;
}
