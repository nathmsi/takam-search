import type { SearchFilters } from './search-filters';

/** The query string of `GET /v1/documents` for these filters: what is empty or default is left out. */
export function buildDocumentsQuery({ q, chapter, type, inForce, meaning }: SearchFilters): string {
  const params = new URLSearchParams();
  if (q.trim() !== '') params.set('q', q.trim());
  if (chapter !== '') params.set('chapter', chapter);
  if (type !== 'all') params.set('type', type);
  if (inForce !== 'all') params.set('inForce', inForce);
  if (meaning && q.trim() !== '') params.set('meaning', 'yes');
  params.set('limit', '1000');
  return params.toString();
}
