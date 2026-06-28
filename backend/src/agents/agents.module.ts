import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { AgentsGateway } from './agents.gateway';
import { DatabaseModule } from '../database/database.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { BootstrapAgentsService } from './bootstrap-agents.service';
import { AgentsHeartbeatMonitor } from './agents-heartbeat.monitor';
import { LogsModule } from '../logs/logs.module';
import { RuntimesModule } from '../runtimes/runtimes.module';

@Module({
  imports: [DatabaseModule, DiscoveryModule, IntegrationsModule, LogsModule, RuntimesModule],
  controllers: [AgentsController],
  providers: [AgentsService, AgentsGateway, BootstrapAgentsService, AgentsHeartbeatMonitor],
  exports: [AgentsService],
})
export class AgentsModule {}
