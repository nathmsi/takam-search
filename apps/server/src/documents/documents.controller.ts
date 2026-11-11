import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DocumentDto, DocumentListDto } from '@takam/contracts';
import { DocumentsService } from './documents.service';
import { ListDocumentsQuery } from './list-documents.query';
import { ParseCodeTextPipe } from './parse-code-text.pipe';

/** The routes `GET /v1/documents` (search and list) and `GET /v1/documents/:codeText` (one document). */
@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Search documents by words, chapter, type and validity' })
  list(@Query() query: ListDocumentsQuery): Promise<DocumentListDto> {
    return this.documents.list(query);
  }

  @Get(':codeText')
  @ApiOperation({ summary: 'One document, by its number (H.1.2.1)' })
  get(@Param('codeText', ParseCodeTextPipe) codeText: string): Promise<DocumentDto> {
    return this.documents.get(codeText);
  }
}
