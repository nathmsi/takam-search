import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';

/** The whole application over the real data, with the database in memory and no log noise. */
export async function createTestApp(): Promise<INestApplication> {
  process.env.DATABASE_DIR = 'memory://';
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app: INestApplication = moduleRef.createNestApplication({ logger: false });
  configureApp(app, ['http://localhost:5173']);
  await app.init();
  return app;
}
