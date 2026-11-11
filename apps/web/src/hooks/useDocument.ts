import type { DocumentDetailDto } from '@takam/contracts';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { documentsApi } from '../services/documents-api';

/** One document with what is attached to it, by its number (`H.1.2.1`). Nothing is asked while no document is selected (`undefined`). */
export function useDocument(codeText: string | undefined): UseQueryResult<DocumentDetailDto> {
  return useQuery({
    queryKey: ['document', codeText],
    queryFn: ({ signal }) => documentsApi.get(codeText as string, signal),
    enabled: codeText !== undefined,
  });
}
