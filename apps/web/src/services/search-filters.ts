import type { DocumentType, InForceFilter } from '@takam/contracts';

/** A kind of document to keep, or `all` of them. */
export type TypeFilter = DocumentType | 'all';

/** The kind of document shown when none is chosen: the instructions, which are what people come for. */
export const DEFAULT_TYPE: TypeFilter = 'Instruction';

/** What the person chose on the search page; it lives in the address (`?q=…&chapter=1.4&type=all&inForce=yes`). */
export interface SearchFilters {
  readonly q: string;
  /** A chapter (`1`) or a sub-chapter (`1.4`); empty for all of them. */
  readonly chapter: string;
  readonly type: TypeFilter;
  readonly inForce: InForceFilter;
}
