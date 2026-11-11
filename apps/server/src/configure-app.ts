import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

/**
 * The setup shared by `main.ts` and the end-to-end tests: security headers, a read-only CORS policy, the `/v1` prefix
 * (the health check stays outside it) and a strict validation of every query (an unknown parameter is a 400).
 */
export function configureApp(app: INestApplication, corsOrigins: readonly string[]): void {
  app.use(
    helmet({
      // The Swagger page (/docs) needs its inline script and styles.
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:'],
        },
      },
    }),
  );
  app.enableCors({ origin: [...corsOrigins], methods: ['GET', 'HEAD', 'OPTIONS'] });
  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
