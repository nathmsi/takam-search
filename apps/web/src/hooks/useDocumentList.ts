import type { DocumentListDto } from '@takam/contracts';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { documentsApi } from '../services/documents-api';
import type { SearchFilters } from '../services/search-filters';

/** The documents that match the filters. The previous list stays on screen while the next one loads (no flash of empty). */
export function useDocumentList(filters: SearchFilters): UseQueryResult<DocumentListDto> {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: ({ signal }) => documentsApi.list(filters, signal),
    placeholderData: keepPreviousData,
  });
}
