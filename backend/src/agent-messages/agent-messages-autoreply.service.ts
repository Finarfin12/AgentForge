import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AgentMessagesService } from './agent-messages.service';
import { AgentsService } from '../agents/agents.service';

const POLL_INTERVAL_MS = 15_000;

@Injectable()
export class AgentMessageAutoReplyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentMessageAutoReplyService.name);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private msgService: AgentMessagesService,
    private agentsService: AgentsService,
  ) {}

  onModuleInit() {
    this.startPolling();
  }

  onModuleDestroy() {
    this.stopPolling();
  }

  startPolling() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.pollAndReply(), POLL_INTERVAL_MS);
    this.logger.log(`Auto-reply polling started (every ${POLL_INTERVAL_MS / 1000}s)`);
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollAndReply() {
    try {
      const allAgents = await this.agentsService.findAll();
      for (const agent of allAgents) {
        const cfg = agent.config || {};
        const canInvoke = agent.isActive && ((cfg as any).provider || (cfg as any).model || (cfg as any).apiEndpoint);
        if (!canInvoke) continue;

        const unread = await this.msgService.unreadCount(agent.id);
        if (unread.count === 0) continue;

        const inbox = await this.msgService.inbox(agent.id);
        for (const msg of inbox) {
          if (msg.status !== 'unread') continue;
          if (msg.type === 'autoreply') continue;
          if (msg.fromAgentId === agent.id) continue;
          if (await this.msgService.isDepthExceeded(msg)) continue;

          await this.msgService.triggerAutoReply(msg);
        }
      }
    } catch (err) {
      this.logger.error(`Poll cycle failed: ${(err as Error).message}`);
    }
  }
}
