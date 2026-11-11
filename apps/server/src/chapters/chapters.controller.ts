import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ChapterDto } from '@takam/contracts';
import { ChaptersRepository } from './chapters.repository';
import { ListChaptersQuery } from './list-chapters.query';

/** The route `GET /v1/chapters`. */
@ApiTags('chapters')
@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chapters: ChaptersRepository) {}

  @Get()
  @ApiOperation({ summary: 'Chapters and sub-chapters with their number of documents' })
  list(@Query() query: ListChaptersQuery): Promise<ChapterDto[]> {
    return this.chapters.findAll(query.type ?? null);
  }
}
