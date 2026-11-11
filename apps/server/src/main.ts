import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { readSettings } from './settings';
import type { Settings } from './settings';

/** Starts the server: the database opens, the routes are set up, the port opens. */
async function bootstrap(): Promise<void> {
  const settings: Settings = readSettings();
  const app = await NestFactory.create(AppModule);
  configureApp(app, settings.corsOrigins);
  const description = new DocumentBuilder().setTitle('Takam Search API').setDescription('Search the documents of the Takam site.').setVersion('0.1.0').build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, description));
  app.enableShutdownHooks();
  await app.listen(settings.port);
  new Logger('Bootstrap').log(`Takam Search API on http://localhost:${settings.port} (docs at /docs)`);
}

void bootstrap();
