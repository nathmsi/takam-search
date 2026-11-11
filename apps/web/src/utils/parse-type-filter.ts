import type { DocumentType } from '@takam/contracts';
import { DEFAULT_TYPE } from '../services/search-filters';
import type { TypeFilter } from '../services/search-filters';

/** Every kind of document the API knows, in the order of the filter. */
export const DOCUMENT_TYPES: readonly DocumentType[] = ['Instruction', 'Temporary Instruction', 'Message', 'Form', 'Tender Notice', 'Tender Details', 'Tender Maintenance'];

/** A kind of document read from the address: `all`, or one of the known kinds; nothing, or anything else, means the default. */
export function parseTypeFilter(value: string | null): TypeFilter {
  if (value === 'all') return 'all';
  return DOCUMENT_TYPES.find((type) => type === value) ?? DEFAULT_TYPE;
}
