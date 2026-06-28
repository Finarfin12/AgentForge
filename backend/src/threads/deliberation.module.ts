import { Module } from '@nestjs/common';
import { DeliberationController } from './deliberation.controller';
import { DeliberationService } from './deliberation.service';
import { DatabaseModule } from '../database/database.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AgentsModule } from '../agents/agents.module';
import { ThreadsModule } from './threads.module';

@Module({
  imports: [DatabaseModule, IntegrationsModule, AgentsModule, ThreadsModule],
  controllers: [DeliberationController],
  providers: [DeliberationService],
  exports: [DeliberationService],
})
export class DeliberationModule {}
