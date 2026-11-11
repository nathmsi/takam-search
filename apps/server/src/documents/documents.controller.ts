import { Controller, Get, Param, Query, Redirect } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DocumentDetailDto, DocumentListDto } from '@takam/contracts';
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

  @Get(':codeText/file')
  @Redirect()
  @ApiOperation({ summary: 'Sends the browser to the file (Word) of a document, on the Takam site (302)' })
  async file(@Param('codeText', ParseCodeTextPipe) codeText: string): Promise<{ url: string }> {
    return { url: await this.documents.fileAddress(codeText) };
  }

  @Get(':codeText')
  @ApiOperation({ summary: 'One document, by its number (H.1.2.1), with the documents attached to it' })
  get(@Param('codeText', ParseCodeTextPipe) codeText: string): Promise<DocumentDetailDto> {
    return this.documents.get(codeText);
  }
}
