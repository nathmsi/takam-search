import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AiService } from '../../src/ai/ai.service';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { TakamSiteClient } from '../../src/documents/takam-site.client';

/** What the outside world answers in a test: no AI and no Takam site is ever called for real. */
interface Fakes {
  /** The embedding of a question (default: fails, which a test of the search by words never needs). */
  readonly embedQuestion?: () => Promise<number[]>;
  /** The file id the Takam site gives for a document (default: fails). */
  readonly findFileId?: (siteDocumentId: string) => Promise<string | null>;
}

/** The whole application over the real data, with the database in memory and no log noise, and the outside world faked. */
export async function createTestApp({ embedQuestion, findFileId }: Fakes = {}): Promise<INestApplication> {
  process.env.DATABASE_DIR = 'memory://';
  const unavailable = (): Promise<never> => Promise.reject(new Error('not available in tests'));
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AiService)
    .useValue({ embedQuestion: embedQuestion ?? unavailable })
    .overrideProvider(TakamSiteClient)
    .useValue({ findFileId: findFileId ?? unavailable })
    .compile();
  const app: INestApplication = moduleRef.createNestApplication({ logger: false });
  configureApp(app, ['http://localhost:5173']);
  await app.init();
  return app;
}
