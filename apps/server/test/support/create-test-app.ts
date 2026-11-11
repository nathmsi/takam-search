import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AiService } from '../../src/ai/ai.service';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';

/**
 * The whole application over the real data, with the database in memory and no log noise. The AI is never called: the
 * service gives the embedding it is given (`embedQuestion`), by default none, which a test of the search by words never needs.
 */
export async function createTestApp(embedQuestion: () => Promise<number[]> = () => Promise.reject(new Error('no AI in tests'))): Promise<INestApplication> {
  process.env.DATABASE_DIR = 'memory://';
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(AiService).useValue({ embedQuestion }).compile();
  const app: INestApplication = moduleRef.createNestApplication({ logger: false });
  configureApp(app, ['http://localhost:5173']);
  await app.init();
  return app;
}
