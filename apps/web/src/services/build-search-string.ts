import { DEFAULT_TYPE } from './search-filters';
import type { SearchFilters } from './search-filters';

/**
 * The address query of the search page for these filters (`?q=…&chapter=1.4`, or nothing). A link keeps it so that the
 * search survives a click, even when the person clicked before the typed words reached the address.
 * The default kind of document is left out: no `type` in the address means the instructions.
 */
export function buildSearchString({ q, chapter, type, inForce, meaning }: SearchFilters): string {
  const params = new URLSearchParams();
  if (q.trim() !== '') params.set('q', q);
  if (chapter !== '') params.set('chapter', chapter);
  if (type !== DEFAULT_TYPE) params.set('type', type);
  if (inForce !== 'all') params.set('inForce', inForce);
  if (meaning) params.set('meaning', 'yes');
  const text: string = params.toString();
  return text === '' ? '' : `?${text}`;
}
