import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsRepository } from './documents.repository';
import { DocumentsService } from './documents.service';

/** The documents: the route, the little logic, the SQL. */
@Module({ controllers: [DocumentsController], providers: [DocumentsService, DocumentsRepository] })
export class DocumentsModule {}
