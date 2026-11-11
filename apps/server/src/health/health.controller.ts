import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HealthDto } from '@takam/contracts';
import { DatabaseService } from '../database/database.service';

/** The route `GET /health`: is the server up, and does the database answer? What a deployment checks after it starts. */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @ApiOperation({ summary: 'Is the server up, and what does the database hold' })
  async check(): Promise<HealthDto> {
    const [counts] = await this.database.query<{ documents: number; chapters: number }>(
      'SELECT (SELECT count(*)::int FROM documents) AS documents, (SELECT count(*)::int FROM chapters) AS chapters',
    );
    return { status: 'ok', service: 'takam-search-server', uptimeSeconds: Math.round(process.uptime()), database: counts };
  }
}
