import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { DocumentDetailDto, DocumentDto, DocumentListDto } from '@takam/contracts';
import { AiService } from '../ai/ai.service';
import { DocumentsRepository } from './documents.repository';
import type { MeaningSearchRequest, SearchPage } from './documents.repository';
import { israelToday } from './israel-today';
import { TakamSiteClient } from './takam-site.client';
import { ListDocumentsQuery } from './list-documents.query';

const SITE_DOWNLOAD = 'https://takam.mof.gov.il/api/DocumentSF/DownloadDocument';

/** The little logic between the route and the SQL: the defaults, and "if nothing has every word, show the closest". */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly repository: DocumentsRepository,
    private readonly ai: AiService,
    private readonly site: TakamSiteClient,
  ) {}

  async list(query: ListDocumentsQuery): Promise<DocumentListDto> {
    const request = {
      today: israelToday(),
      words: query.q ?? '',
      chapter: query.chapter ?? null,
      type: query.type ?? null,
      inForce: query.inForce ?? 'all',
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    } as const;
    if (query.meaning !== 'yes' || request.words === '') return this.listByWords(request, false);
    const embedding: number[] | null = await this.embed(request.words);
    if (embedding === null) return this.listByWords(request, true);
    const page: SearchPage = await this.repository.searchByMeaning({ ...request, embedding });
    return { ...page, relaxed: false, meaning: true, meaningUnavailable: false };
  }

  /** The search by words: every word, or, when no document has them all, the closest ones. */
  private async listByWords(request: Omit<MeaningSearchRequest, 'embedding'>, meaningUnavailable: boolean): Promise<DocumentListDto> {
    const exact: SearchPage = await this.repository.search({ ...request, mode: 'all' });
    if (exact.total > 0 || request.words.trim() === '') return { ...exact, relaxed: false, meaning: false, meaningUnavailable };
    const closest: SearchPage = await this.repository.search({ ...request, mode: 'any' });
    return { ...closest, relaxed: closest.total > 0, meaning: false, meaningUnavailable };
  }

  /**
   * The experiment: the question becomes an embedding (AI). `null` when the AI cannot answer (no key, quota spent, provider
   * down): the caller falls back on the search by words instead of failing. Any other error is a bug and goes on.
   */
  private async embed(words: string): Promise<number[] | null> {
    try {
      return await this.ai.embedQuestion(words);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) return null;
      throw error;
    }
  }

  async get(codeText: string): Promise<DocumentDetailDto> {
    const today: string = israelToday();
    const document: DocumentDto | undefined = await this.repository.findByCodeText(today, codeText);
    if (document === undefined) throw new NotFoundException(`No document ${codeText}`);
    return { ...document, related: await this.repository.findRelated(today, codeText) };
  }

  /** Where to send a person who wants the file of a document: the download address of the Takam site. 404 when there is none. */
  async fileAddress(codeText: string): Promise<string> {
    const siteId: string | undefined = await this.repository.findSiteId(codeText);
    if (siteId === undefined) throw new NotFoundException(`No document ${codeText}`);
    const fileId: string | null = await this.site.findFileId(siteId);
    if (fileId === null || !/^[A-Za-z0-9]{15,18}$/.test(fileId)) throw new NotFoundException(`The document ${codeText} has no file`);
    return `${SITE_DOWNLOAD}/${fileId}/x`;
  }
}
