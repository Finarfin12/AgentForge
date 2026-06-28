import { Module } from '@nestjs/common';
import { AgentMessagesController } from './agent-messages.controller';
import { AgentMessagesService } from './agent-messages.service';
import { AgentMessagesGateway } from './agent-messages.gateway';
import { AgentMessageAutoReplyService } from './agent-messages-autoreply.service';
import { DatabaseModule } from '../database/database.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [DatabaseModule, AgentsModule],
  controllers: [AgentMessagesController],
  providers: [AgentMessagesService, AgentMessagesGateway, AgentMessageAutoReplyService],
  exports: [AgentMessagesService],
})
export class AgentMessagesModule {}
