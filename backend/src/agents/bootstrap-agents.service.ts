import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, DiscoveredAgent } from '../discovery/discovery.service';
import { AgentsService } from './agents.service';

@Injectable()
export class BootstrapAgentsService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapAgentsService.name);

  constructor(
    private discoveryService: DiscoveryService,
    private agentsService: AgentsService,
  ) {}

  async onModuleInit() {
    if (process.env.AUTO_DISCOVER_ON_STARTUP !== 'true') return;

    this.logger.log('Starting auto-discovery of agents...');
    try {
      const discovered = await this.discoveryService.discoverLocal();
      for (const agent of discovered) {
        await this.autoRegisterAgent(agent);
      }
    } catch (err) {
      this.logger.warn(`Auto-discovery failed: ${(err as Error).message}`);
    }
  }

  private async autoRegisterAgent(discovered: DiscoveredAgent) {
    const isCli = discovered.type === 'cli';
    const slug = isCli
      ? `local_${discovered.type}_${(discovered.models?.[0] || 'cli').replace(/[^a-z0-9]/g, '_')}`
      : `local_${discovered.type}_${discovered.port}`;
    const slugSafe = slug.length > 95 ? slug.slice(0, 95) : slug; // ensure under varchar(100)

    try {
      const existing = await this.agentsService.findAll({ search: slugSafe });
      const availableModel = discovered.models?.[0] || 'default';

      if (existing.length > 0) {
        const agent = existing[0];
        const config: any = agent.config || {};
        if (config.model !== availableModel && availableModel !== 'default') {
          config.model = availableModel;
          await this.agentsService.update(agent.id, { config });
          this.logger.log(`Updated auto-registered agent ${slug} with model ${availableModel}`);
        }
        return;
      }

      const agentConfig: Record<string, unknown> = {
        provider: discovered.type,
        model: availableModel,
        temperature: 0.7,
        maxTokens: 4096,
      };

      if (!isCli) {
        agentConfig.apiEndpoint = `http://${discovered.host}:${discovered.port}`;
      }

      await this.agentsService.create({
        name: slugSafe,
        displayName: isCli ? discovered.name : `Local ${discovered.name}`,
        description: isCli
          ? `CLI-based agent: ${discovered.name}`
          : `Auto-discovered ${discovered.type} on port ${discovered.port}`,
        capabilities: ['agentic-coding'],
        config: agentConfig,
      });
      this.logger.log(`Auto-registered ${isCli ? 'CLI' : ''} agent: ${slugSafe}`);
    } catch (err) {
      this.logger.warn(`Failed to auto-register ${slugSafe}: ${(err as Error).message}`);
    }
  }
}
