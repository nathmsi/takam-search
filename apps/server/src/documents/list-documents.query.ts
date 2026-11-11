import { ApiPropertyOptional } from '@nestjs/swagger';
import type { DocumentType, InForceFilter } from '@takam/contracts';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const DOCUMENT_TYPES: readonly DocumentType[] = ['Instruction', 'Temporary Instruction', 'Message', 'Form', 'Tender Notice', 'Tender Details', 'Tender Maintenance'];

const trimmed = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

/** The query string of `GET /v1/documents`. Anything else is refused (400). */
export class ListDocumentsQuery {
  @ApiPropertyOptional({ description: 'Words to look for: in the title, the keywords, the description and the number.', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trimmed)
  q?: string;

  @ApiPropertyOptional({ description: 'A chapter (`1`) or a sub-chapter (`1.4`).', example: '1.4' })
  @IsOptional()
  @Matches(/^\d{1,2}(\.\d{1,2})?$/, { message: 'chapter must look like 1 or 1.4' })
  chapter?: string;

  @ApiPropertyOptional({ enum: DOCUMENT_TYPES, description: 'A kind of document; all kinds when missing.' })
  @IsOptional()
  @IsIn(DOCUMENT_TYPES)
  type?: DocumentType;

  @ApiPropertyOptional({ enum: ['yes', 'no', 'all'], default: 'all' })
  @IsOptional()
  @IsIn(['yes', 'no', 'all'])
  inForce?: InForceFilter;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
