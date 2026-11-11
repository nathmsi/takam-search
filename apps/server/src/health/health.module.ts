import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/** The health check. */
@Module({ controllers: [HealthController] })
export class HealthModule {}
