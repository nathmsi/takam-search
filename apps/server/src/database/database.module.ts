import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

/** Makes the database available to every part of the server. */
@Global()
@Module({ providers: [DatabaseService], exports: [DatabaseService] })
export class DatabaseModule {}
