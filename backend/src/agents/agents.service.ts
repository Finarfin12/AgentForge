import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { agents, agentSkills, skills, agentRuntimes } from '../database/schema';
import { eq, ilike, and, or, sql } from 'drizzle-orm';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { InvokeAgentDto } from './dto/invoke-agent.dto';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  constructor(
    private db: DatabaseService,
    private integrations: IntegrationsService,
  ) {}

  async findAll(query?: { search?: string; isActive?: boolean }) {
    let q = this.db.drizzle
      .select({
        id: agents.id,
        name: agents.name,
        displayName: agents.displayName,
        description: agents.description,
        avatarUrl: agents.avatarUrl,
        status: agents.status,
        capabilities: agents.capabilities,
        config: agents.config,
        runtimeId: agents.runtimeId,
        runtimeName: agentRuntimes.name,
        runtimeProvider: agentRuntimes.provider,
        runtimeStatus: agentRuntimes.status,
        maxConcurrentTasks: agents.maxConcurrentTasks,
        currentTaskCount: agents.currentTaskCount,
        avgResponseTimeMs: agents.avgResponseTimeMs,
        successRate: agents.successRate,
        totalTasksCompleted: agents.totalTasksCompleted,
        totalTokensUsed: agents.totalTokensUsed,
        isActive: agents.isActive,
        lastHeartbeatAt: agents.lastHeartbeatAt,
        createdAt: agents.createdAt,
        updatedAt: agents.updatedAt,
      })
      .from(agents)
      .leftJoin(agentRuntimes, eq(agentRuntimes.id, agents.runtimeId));

    const conditions: any[] = [];
    if (query?.search) {
      const s = `%${query.search}%`;
      conditions.push(or(ilike(agents.name, s), ilike(agents.displayName, s)));
    }
    if (query?.isActive !== undefined) {
      conditions.push(eq(agents.isActive, query.isActive));
    }
    if (conditions.length > 0) (q as any).where(and(...conditions));
    return q;
  }

  async findOne(id: string) {
    const [agent] = await this.db.drizzle
      .select({
        id: agents.id,
        name: agents.name,
        displayName: agents.displayName,
        description: agents.description,
        avatarUrl: agents.avatarUrl,
        status: agents.status,
        capabilities: agents.capabilities,
        config: agents.config,
        runtimeId: agents.runtimeId,
        runtimeName: agentRuntimes.name,
        runtimeProvider: agentRuntimes.provider,
        runtimeStatus: agentRuntimes.status,
        maxConcurrentTasks: agents.maxConcurrentTasks,
        currentTaskCount: agents.currentTaskCount,
        avgResponseTimeMs: agents.avgResponseTimeMs,
        successRate: agents.successRate,
        totalTasksCompleted: agents.totalTasksCompleted,
        totalTokensUsed: agents.totalTokensUsed,
        isActive: agents.isActive,
        lastHeartbeatAt: agents.lastHeartbeatAt,
        createdAt: agents.createdAt,
        updatedAt: agents.updatedAt,
      })
      .from(agents)
      .leftJoin(agentRuntimes, eq(agentRuntimes.id, agents.runtimeId))
      .where(eq(agents.id, id))
      .limit(1);

    if (!agent) throw new NotFoundException(`Agent ${id} not found`);

    const agentSkillRows = await this.db.drizzle
      .select({
        id: skills.id,
        name: skills.name,
        description: skills.description,
        origin: skills.origin,
      })
      .from(skills)
      .innerJoin(agentSkills, eq(agentSkills.skillId, skills.id))
      .where(eq(agentSkills.agentId, id));

    return { ...agent, skills: agentSkillRows };
  }

  async create(dto: CreateAgentDto) {
    const existing = await this.db.drizzle
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.name, dto.name))
      .limit(1);
    if (existing.length > 0) throw new ConflictException(`Agent name '${dto.name}' already taken`);

    if (dto.runtimeId) {
      const [rt] = await this.db.drizzle.select().from(agentRuntimes).where(eq(agentRuntimes.id, dto.runtimeId)).limit(1);
      if (!rt) throw new BadRequestException('Runtime not found');
    }

    const [agent] = await this.db.drizzle
      .insert(agents)
      .values({
        name: dto.name,
        displayName: dto.displayName,
        description: dto.description,
        avatarUrl: dto.avatarUrl,
        capabilities: dto.capabilities ?? [],
        config: dto.config ?? {},
        runtimeId: dto.runtimeId,
        maxConcurrentTasks: dto.maxConcurrentTasks ?? 5,
        isActive: dto.isActive ?? true,
      })
      .returning();

    if (dto.skillIds?.length) {
      for (const skillId of dto.skillIds) {
        await this.db.drizzle
          .insert(agentSkills)
          .values({ agentId: agent.id, skillId })
          .onConflictDoNothing();
      }
    }

    return agent;
  }

  async update(id: string, dto: UpdateAgentDto) {
    await this.findOne(id);
    if ((dto as any).runtimeId) {
      const [rt] = await this.db.drizzle.select().from(agentRuntimes).where(eq(agentRuntimes.id, (dto as any).runtimeId)).limit(1);
      if (!rt) throw new BadRequestException('Runtime not found');
    }
    const [updated] = await this.db.drizzle
      .update(agents)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning();
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.drizzle.delete(agents).where(eq(agents.id, id));
    return { deleted: id };
  }

  async heartbeat(id: string) {
    const [agent] = await this.db.drizzle
      .update(agents)
      .set({ status: 'idle', lastHeartbeatAt: new Date() })
      .where(eq(agents.id, id))
      .returning({ id: agents.id, lastHeartbeatAt: agents.lastHeartbeatAt, status: agents.status });
    if (!agent) throw new NotFoundException(`Agent ${id} not found`);
    return agent;
  }

  async updateStatus(id: string, status: 'idle' | 'busy' | 'offline' | 'error') {
    const [agent] = await this.db.drizzle
      .update(agents)
      .set({ status, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning({ id: agents.id, status: agents.status });
    if (!agent) throw new NotFoundException(`Agent ${id} not found`);
    return agent;
  }

  async invoke(id: string, dto: InvokeAgentDto) {
    const agent = await this.findOne(id);
    if (!agent.isActive) throw new BadRequestException(`Agent '${agent.name}' is not active`);
    if ((agent.currentTaskCount || 0) >= (agent.maxConcurrentTasks || 5))
      throw new BadRequestException(`Agent '${agent.name}' is at max concurrency`);

    const { providerName, model, temperature, maxTokens } = await this.resolveConfig(agent, dto);

    await this.db.drizzle
      .update(agents)
      .set({ status: 'busy', currentTaskCount: sql`${agents.currentTaskCount} + 1`, updatedAt: new Date() })
      .where(eq(agents.id, id));

    const startTime = Date.now();
    try {
      this.logger.log(`Invoking agent ${agent.name} (${providerName}/${model})`);
      const messages = this.buildMessages(agent, dto);
      const response = await this.integrations.chatCompletion(providerName, {
        model, messages, temperature, maxTokens,
      });

      const durationMs = Date.now() - startTime;
      await this.db.drizzle
        .update(agents)
        .set({
          status: 'idle',
          currentTaskCount: sql`GREATEST(${agents.currentTaskCount} - 1, 0)`,
          totalTasksCompleted: (agent.totalTasksCompleted || 0) + 1,
          avgResponseTimeMs: Math.round(
            ((agent.avgResponseTimeMs || 0) * (agent.totalTasksCompleted || 0) + durationMs) /
            ((agent.totalTasksCompleted || 0) + 1),
          ),
          totalTokensUsed: (agent.totalTokensUsed || 0) + (response.usage?.totalTokens || 0),
          updatedAt: new Date(),
        })
        .where(eq(agents.id, id));

      return {
        agentId: id, agentName: agent.name, provider: providerName, model,
        content: response.content, usage: response.usage, durationMs,
      };
    } catch (err) {
      this.logger.error(`Agent invocation failed: ${(err as Error).message}`);
      await this.db.drizzle
        .update(agents)
        .set({ status: 'idle', currentTaskCount: sql`GREATEST(${agents.currentTaskCount} - 1, 0)`, updatedAt: new Date() })
        .where(eq(agents.id, id));
      throw err;
    }
  }

  async *invokeStream(id: string, dto: InvokeAgentDto): AsyncGenerator<string> {
    const agent = await this.findOne(id);
    if (!agent.isActive) throw new BadRequestException(`Agent '${agent.name}' is not active`);
    if ((agent.currentTaskCount || 0) >= (agent.maxConcurrentTasks || 5))
      throw new BadRequestException(`Agent '${agent.name}' is at max concurrency`);

    const { providerName, model, temperature, maxTokens } = await this.resolveConfig(agent, dto);

    await this.db.drizzle
      .update(agents)
      .set({ status: 'busy', currentTaskCount: sql`${agents.currentTaskCount} + 1`, updatedAt: new Date() })
      .where(eq(agents.id, id));

    const startTime = Date.now();
    let fullContent = '';
    let usage: any = undefined;

    try {
      this.logger.log(`Streaming agent ${agent.name} (${providerName}/${model})`);
      const messages = this.buildMessages(agent, dto);
      const stream = this.integrations.chatCompletionStream(providerName, { model, messages, temperature, maxTokens });

      for await (const chunk of stream) {
        if (chunk.token) { fullContent += chunk.token; yield `data: ${JSON.stringify({ type: 'token', token: chunk.token })}\n\n`; }
        if (chunk.done) usage = chunk.usage;
      }

      const durationMs = Date.now() - startTime;
      await this.db.drizzle
        .update(agents)
        .set({
          status: 'idle',
          currentTaskCount: sql`GREATEST(${agents.currentTaskCount} - 1, 0)`,
          totalTasksCompleted: (agent.totalTasksCompleted || 0) + 1,
          avgResponseTimeMs: Math.round(
            ((agent.avgResponseTimeMs || 0) * (agent.totalTasksCompleted || 0) + durationMs) /
            ((agent.totalTasksCompleted || 0) + 1),
          ),
          totalTokensUsed: (agent.totalTokensUsed || 0) + (usage?.totalTokens || 0),
          updatedAt: new Date(),
        })
        .where(eq(agents.id, id));

      yield `data: ${JSON.stringify({ type: 'done', agentId: id, agentName: agent.name, provider: providerName, model, content: fullContent, usage, durationMs })}\n\n`;
    } catch (err) {
      await this.db.drizzle
        .update(agents)
        .set({ status: 'idle', currentTaskCount: sql`GREATEST(${agents.currentTaskCount} - 1, 0)`, updatedAt: new Date() })
        .where(eq(agents.id, id));
      yield `data: ${JSON.stringify({ type: 'error', message: (err as Error).message })}\n\n`;
    }
  }

  private buildMessages(agent: any, dto: InvokeAgentDto) {
    const skillText = agent.skills?.length
      ? agent.skills.map((s: any) => `- ${s.name}: ${s.description || ''}`).join('\n')
      : '';
    const systemContent = `You are ${agent.displayName || agent.name}. ${agent.description || ''}` +
      (skillText ? `\n\n## Skills\n${skillText}` : '');
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [{ role: 'system', content: systemContent }];
    if (dto.history?.length) { for (const msg of dto.history) messages.push({ role: msg.role, content: msg.content }); }
    messages.push({ role: 'user', content: dto.prompt });
    return messages;
  }

  private async resolveConfig(agent: any, dto: InvokeAgentDto) {
    const config = (agent.config || {}) as any;

    // Check if agent has a runtime — if so, prefer runtime provider over config
    if (agent.runtimeId) {
      const [rt] = await this.db.drizzle
        .select({ provider: agentRuntimes.provider, name: agentRuntimes.name, metadata: agentRuntimes.metadata })
        .from(agentRuntimes)
        .where(eq(agentRuntimes.id, agent.runtimeId))
        .limit(1);
      if (rt && rt.provider === 'cli') {
        const cliBinary = (rt.metadata as any)?.cliBinary || rt.name.replace('CLI ', '').toLowerCase();
        return {
          providerName: 'cli',
          model: cliBinary,
          temperature: dto.temperature ?? config.temperature ?? 0.7,
          maxTokens: dto.maxTokens ?? config.maxTokens ?? 4096,
        };
      }
      if (rt && rt.provider && rt.provider !== 'cli') {
        return {
          providerName: rt.provider,
          model: config.model || 'default',
          temperature: dto.temperature ?? config.temperature ?? 0.7,
          maxTokens: dto.maxTokens ?? config.maxTokens ?? 4096,
        };
      }
    }

    const providerName = config.provider || 'ollama';
    const model = config.model || (providerName === 'ollama' ? 'llama3' : 'default');
    const temperature = dto.temperature ?? config.temperature ?? 0.7;
    const maxTokens = dto.maxTokens ?? config.maxTokens ?? 4096;
    return { providerName, model, temperature, maxTokens };
  }
}
