import { Injectable } from '@nestjs/common';
import type { ChapterDto } from '@takam/contracts';
import { DatabaseService } from '../database/database.service';

/**
 * Every chapter and sub-chapter, with how many documents it holds ($1 = a kind of document to count, or NULL for all).
 * A chapter counts the documents of its sub-chapters too. The order is the order of the numbers (1.2 before 1.10).
 */
const CHAPTERS_SQL = `
  SELECT c.code,
         c.title,
         c.parent_code AS "parentCode",
         (SELECT count(*)::int
          FROM documents d
          WHERE ($1::text IS NULL OR d.type = $1::text)
            AND (d.chapter_code = c.code
                 OR d.chapter_code IN (SELECT sub.code FROM chapters sub WHERE sub.parent_code = c.code))) AS "documentCount"
  FROM chapters c
  ORDER BY natural_key(c.code)
`;

/** Every SQL query on the chapters is here. */
@Injectable()
export class ChaptersRepository {
  constructor(private readonly database: DatabaseService) {}

  findAll(type: string | null): Promise<ChapterDto[]> {
    return this.database.query<ChapterDto>(CHAPTERS_SQL, [type]);
  }
}
