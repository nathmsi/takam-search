import { ApiPropertyOptional } from '@nestjs/swagger';
import type { DocumentType } from '@takam/contracts';
import { IsIn, IsOptional } from 'class-validator';

const DOCUMENT_TYPES: readonly DocumentType[] = ['Instruction', 'Temporary Instruction', 'Message', 'Form', 'Tender Notice', 'Tender Details', 'Tender Maintenance'];

/** The query string of `GET /v1/chapters`. */
export class ListChaptersQuery {
  @ApiPropertyOptional({ enum: DOCUMENT_TYPES, description: 'Count only this kind of document; all kinds when missing.' })
  @IsOptional()
  @IsIn(DOCUMENT_TYPES)
  type?: DocumentType;
}
