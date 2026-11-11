import type { InForceFilter } from '@takam/contracts';

/** A validity read from the address: only `yes` and `no` count, anything else means "all". */
export function parseInForceFilter(value: string | null): InForceFilter {
  return value === 'yes' || value === 'no' ? value : 'all';
}
