import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { agentMessages } from '../database/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { AgentMessagesGateway } from './agent-messages.gateway';
import { AgentsService } from '../agents/agents.service';

const MAX_DEPTH = 5;

@Injectable()
export class AgentMessagesService {
  private readonly logger = new Logger(AgentMessagesService.name);

  constructor(
    private db: DatabaseService,
    private gateway: AgentMessagesGateway,
    private agentsService: AgentsService,
  ) {}

  async inbox(agentId: string) {
    return this.db.drizzle
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.toAgentId, agentId))
      .orderBy(desc(agentMessages.createdAt));
  }

  async sent(agentId: string) {
    return this.db.drizzle
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.fromAgentId, agentId))
      .orderBy(desc(agentMessages.createdAt));
  }

  async thread(threadId: string) {
    return this.db.drizzle
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.threadId, threadId))
      .orderBy(agentMessages.createdAt);
  }

  async send(data: {
    fromAgentId: string;
    toAgentId: string;
    subject: string;
    body: string;
    type?: string;
    priority?: string;
    relatedTaskId?: string;
    threadId?: string;
    parentId?: string;
  }) {
    const threadId = data.threadId || randomUUID();
    const result = await this.db.drizzle
      .insert(agentMessages)
      .values({
        fromAgentId: data.fromAgentId,
        toAgentId: data.toAgentId,
        subject: data.subject,
        body: data.body,
        type: (data.type || 'message') as any,
        priority: (data.priority || 'normal') as any,
        relatedTaskId: data.relatedTaskId,
        threadId,
        parentId: data.parentId,
      })
      .returning();
    const msg = result[0];

    this.gateway.broadcastNewMessage(msg);

    // Immediate auto-reply in background
    this.tryAutoReply(msg);

    return msg;
  }

  async triggerAutoReply(msg: any) {
    return this.tryAutoReply(msg);
  }

  async isDepthExceeded(msg: any): Promise<boolean> {
    return this.depthExceeded(msg);
  }

  private async tryAutoReply(msg: any) {
    if (msg.type === 'autoreply') return;
    if (!msg || msg.fromAgentId === msg.toAgentId) return;
    if (await this.depthExceeded(msg)) return;

    const agent = await this.agentsService.findOne(msg.toAgentId).catch(() => null);
    if (!agent || !this.canInvoke(agent)) return;

    try {
      await this.markRead(msg.id, msg.toAgentId);

      const history = await this.buildHistory(msg.threadId, msg.id);
      const prompt = history.map((m: any) =>
        `${m.fromAgentId === msg.toAgentId ? 'You' : m.fromAgentId.slice(0, 8)}: ${m.body}`
      ).join('\n\n');

      const result = await this.agentsService.invoke(msg.toAgentId, {
        prompt,
        maxTokens: (agent.config as any)?.maxTokens ?? 2048,
        temperature: (agent.config as any)?.temperature ?? 0.7,
      });

      await this.send({
        fromAgentId: msg.toAgentId,
        toAgentId: msg.fromAgentId,
        subject: `Re: ${msg.subject}`,
        body: result.content,
        type: 'autoreply',
        threadId: msg.threadId,
        parentId: msg.id,
      });
    } catch (err) {
      this.logger.error(`Auto-reply failed for msg ${msg.id}: ${(err as Error).message}`);
    }
  }

  private canInvoke(agent: any): boolean {
    if (!agent.isActive) return false;
    const cfg = agent.config || {};
    return !!(cfg.provider || cfg.model || (cfg as any)?.apiEndpoint);
  }

  private async depthExceeded(msg: any): Promise<boolean> {
    let depth = 0;
    let current = msg;
    while (current.parentId) {
      depth++;
      if (depth > MAX_DEPTH) return true;
      current = await this.findById(current.parentId).catch(() => null);
      if (!current) break;
    }
    return false;
  }

  private async buildHistory(threadId: string, untilMsgId: string): Promise<any[]> {
    const msgs = await this.thread(threadId);
    const result: any[] = [];
    for (const m of msgs) {
      result.push(m);
      if (m.id === untilMsgId) break;
    }
    return result;
  }

  async markRead(id: string, agentId: string) {
    const msg = await this.db.drizzle
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.id, id))
      .then(r => r[0]);
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.toAgentId !== agentId) throw new ForbiddenException('Not your message');
    const updated = await this.db.drizzle
      .update(agentMessages)
      .set({ status: 'read' as any, readAt: new Date() })
      .where(eq(agentMessages.id, id))
      .returning();
    return updated[0];
  }

  async archive(id: string, agentId: string) {
    const msg = await this.db.drizzle
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.id, id))
      .then(r => r[0]);
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.toAgentId !== agentId && msg.fromAgentId !== agentId) {
      throw new ForbiddenException('Not your message');
    }
    const updated = await this.db.drizzle
      .update(agentMessages)
      .set({ status: 'archived' as any })
      .where(eq(agentMessages.id, id))
      .returning();
    return updated[0];
  }

  async unreadCount(agentId: string) {
    const result = await this.db.drizzle
      .select({ count: sql<number>`count(*)` })
      .from(agentMessages)
      .where(
        and(
          eq(agentMessages.toAgentId, agentId),
          eq(agentMessages.status, 'unread' as any),
        ),
      );
    return { count: Number(result[0]?.count ?? 0) };
  }

  async findById(id: string) {
    const msg = await this.db.drizzle
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.id, id))
      .then(r => r[0]);
    if (!msg) throw new NotFoundException('Message not found');
    return msg;
  }

  async reply(parentId: string, data: {
    fromAgentId: string;
    toAgentId: string;
    subject: string;
    body: string;
    type?: string;
  }) {
    const parent = await this.findById(parentId);
    return this.send({
      ...data,
      threadId: parent.threadId ?? undefined,
      parentId: parent.id,
    });
  }
}
