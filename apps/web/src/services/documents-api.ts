import type { ChapterDto, DocumentDto, DocumentListDto, DocumentType } from '@takam/contracts';
import { buildDocumentsQuery } from './build-documents-query';
import { fetchJson } from './fetch-json';
import type { SearchFilters } from './search-filters';

/** The routes of the API the web app reads (`apps/server`). */
export const documentsApi = {
  list: (filters: SearchFilters, signal?: AbortSignal): Promise<DocumentListDto> =>
    fetchJson<DocumentListDto>(`/v1/documents?${buildDocumentsQuery(filters)}`, signal),

  get: (codeText: string, signal?: AbortSignal): Promise<DocumentDto> =>
    fetchJson<DocumentDto>(`/v1/documents/${encodeURIComponent(codeText)}`, signal),

  /** The chapters; with a `type`, the counts are those documents only. */
  chapters: (type: DocumentType | undefined, signal?: AbortSignal): Promise<ChapterDto[]> =>
    fetchJson<ChapterDto[]>(type === undefined ? '/v1/chapters' : `/v1/chapters?type=${encodeURIComponent(type)}`, signal),
};
