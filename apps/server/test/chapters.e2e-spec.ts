import type { INestApplication } from '@nestjs/common';
import type { ChapterDto } from '@takam/contracts';
import request from 'supertest';
import { createTestApp } from './support/create-test-app';

describe('Chapters (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/chapters gives the 16 chapters and their sub-chapters, in the order of the numbers', async () => {
    const { status, body } = await request(app.getHttpServer()).get('/v1/chapters');

    const chapters = body as ChapterDto[];
    const codes = chapters.map((chapter) => chapter.code);
    expect(status).toBe(200);
    expect(chapters.filter((chapter) => chapter.parentCode === null)).toHaveLength(16);
    expect(codes.indexOf('1.2')).toBeLessThan(codes.indexOf('1.10'));
    expect(codes.indexOf('1.10')).toBeLessThan(codes.indexOf('2'));
  });

  it('GET /v1/chapters includes chapter 10, which the Takam site does not list', async () => {
    const { body } = await request(app.getHttpServer()).get('/v1/chapters');

    expect((body as ChapterDto[]).find((chapter) => chapter.code === '10')).toMatchObject({ title: 'ניהול מלאי ומצאי', parentCode: null });
  });

  it('GET /v1/chapters?type=Instruction counts the instructions of each chapter, the sub-chapters adding up to the chapter', async () => {
    const { body } = await request(app.getHttpServer()).get('/v1/chapters').query({ type: 'Instruction' });

    const chapters = body as ChapterDto[];
    const first = chapters.find((chapter) => chapter.code === '1') as ChapterDto;
    const ofFirst = chapters.filter((chapter) => chapter.parentCode === '1').reduce((sum, chapter) => sum + chapter.documentCount, 0);
    expect(first.documentCount).toBe(34);
    expect(ofFirst).toBe(34);
  });

  it('GET /v1/chapters refuses a kind of document that does not exist', async () => {
    expect((await request(app.getHttpServer()).get('/v1/chapters').query({ type: 'Poem' })).status).toBe(400);
  });
});
