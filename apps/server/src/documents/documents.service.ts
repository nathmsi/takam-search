import { Injectable, NotFoundException } from '@nestjs/common';
import type { DocumentDto, DocumentListDto } from '@takam/contracts';
import { DocumentsRepository } from './documents.repository';
import type { SearchPage } from './documents.repository';
import { israelToday } from './israel-today';
import { ListDocumentsQuery } from './list-documents.query';

/** The little logic between the route and the SQL: the defaults, and "if nothing has every word, show the closest". */
@Injectable()
export class DocumentsService {
  constructor(private readonly repository: DocumentsRepository) {}

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
    const exact: SearchPage = await this.repository.search({ ...request, mode: 'all' });
    if (exact.total > 0 || request.words.trim() === '') return { ...exact, relaxed: false };
    const closest: SearchPage = await this.repository.search({ ...request, mode: 'any' });
    return { ...closest, relaxed: closest.total > 0 };
  }

  async get(codeText: string): Promise<DocumentDto> {
    const document: DocumentDto | undefined = await this.repository.findByCodeText(israelToday(), codeText);
    if (document === undefined) throw new NotFoundException(`No document ${codeText}`);
    return document;
  }
}
