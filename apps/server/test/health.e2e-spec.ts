import type { INestApplication } from '@nestjs/common';
import type { HealthDto } from '@takam/contracts';
import request from 'supertest';
import { createTestApp } from './support/create-test-app';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /health says the server is up and what the database holds (outside the /v1 prefix)', async () => {
    const { status, body } = await request(app.getHttpServer()).get('/health');

    expect(status).toBe(200);
    expect(body as HealthDto).toMatchObject({ status: 'ok', service: 'takam-search-server', database: { documents: 922, chapters: 122 } });
  });
});
