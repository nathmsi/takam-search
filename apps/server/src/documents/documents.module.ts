import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { DocumentsController } from './documents.controller';
import { DocumentsRepository } from './documents.repository';
import { DocumentsService } from './documents.service';
import { TakamSiteClient } from './takam-site.client';

/** The documents: the route, the little logic, the SQL. */
@Module({ imports: [AiModule], controllers: [DocumentsController], providers: [DocumentsService, DocumentsRepository, TakamSiteClient] })
export class DocumentsModule {}
