import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ChaptersModule } from './chapters/chapters.module';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './documents/documents.module';
import { AllExceptionsFilter } from './errors/all-exceptions.filter';
import { HealthModule } from './health/health.module';

/** The server is four parts: the database, the documents, the chapters and the health check. */
@Module({
  imports: [DatabaseModule, DocumentsModule, ChaptersModule, HealthModule],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
