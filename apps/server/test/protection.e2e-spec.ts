import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './support/create-test-app';

describe('Protection (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('answers an unknown address with a 404 in the common JSON body (never a web page with a 200)', async () => {
    const { status, body, type } = await request(app.getHttpServer()).get('/v1/nothing-here');

    expect(status).toBe(404);
    expect(type).toBe('application/json');
    expect(body).toMatchObject({ statusCode: 404, error: 'Not Found', path: '/v1/nothing-here' });
  });

  it('is read-only: a write is refused', async () => {
    expect((await request(app.getHttpServer()).post('/v1/documents').send({ title: 'x' })).status).toBe(404);
    expect((await request(app.getHttpServer()).delete('/v1/documents/H.1.2.1')).status).toBe(404);
  });

  it('sends security headers', async () => {
    const { headers } = await request(app.getHttpServer()).get('/health');

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-powered-by']).toBeUndefined();
  });

  it('answers the origins it knows, and only for reading', async () => {
    const { headers } = await request(app.getHttpServer())
      .options('/v1/documents')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(headers['access-control-allow-methods']).toBe('GET,HEAD,OPTIONS');
  });

  it('does not allow an unknown origin', async () => {
    const { headers } = await request(app.getHttpServer()).get('/health').set('Origin', 'https://evil.example');

    expect(headers['access-control-allow-origin']).toBeUndefined();
  });
});
