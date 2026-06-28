import { Module } from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { ThreadsController } from './threads.controller';
import { ThreadsGateway } from './threads.gateway';
import { DatabaseModule } from '../database/database.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [DatabaseModule, IntegrationsModule],
  controllers: [ThreadsController],
  providers: [ThreadsService, ThreadsGateway],
  exports: [ThreadsService, ThreadsGateway],
})
export class ThreadsModule {}
