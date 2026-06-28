import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AgentsService } from './agents.service';

@Injectable()
export class AgentsHeartbeatMonitor implements OnModuleInit, OnModuleDestroy {
  private intervalId?: NodeJS.Timeout;
  private readonly logger = new Logger(AgentsHeartbeatMonitor.name);

  constructor(private agentsService: AgentsService) {}

  onModuleInit() {
    this.intervalId = setInterval(() => this.checkAllAgents(), 60000);
  }

  onModuleDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async checkAllAgents() {
    try {
      const agents = await this.agentsService.findAll();
      const now = Date.now();
      const TIMEOUT_MS = 120_000; // 2 minutes

      for (const agent of agents) {
        if (!agent.lastHeartbeatAt) continue;
        const elapsed = now - new Date(agent.lastHeartbeatAt).getTime();
        if (elapsed > TIMEOUT_MS && agent.status !== 'offline') {
          await this.agentsService.updateStatus(agent.id, 'offline');
          this.logger.warn(`Agent ${agent.name} marked offline (no heartbeat)`);
        }
      }
    } catch (err) {
      this.logger.error(`Heartbeat monitor error: ${(err as Error).message}`);
    }
  }
}
