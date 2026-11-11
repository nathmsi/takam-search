import { Module } from '@nestjs/common';
import { ChaptersController } from './chapters.controller';
import { ChaptersRepository } from './chapters.repository';

/** The chapters: the route and the SQL. */
@Module({ controllers: [ChaptersController], providers: [ChaptersRepository] })
export class ChaptersModule {}
