import type { ChapterDto, DocumentType } from '@takam/contracts';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { documentsApi } from '../services/documents-api';

/** The chapters and sub-chapters; with a `type`, their counts are those documents only. They never change during a visit. */
export function useChapters(type?: DocumentType): UseQueryResult<ChapterDto[]> {
  return useQuery({
    queryKey: ['chapters', type ?? 'all'],
    queryFn: ({ signal }) => documentsApi.chapters(type, signal),
    staleTime: Infinity,
  });
}
