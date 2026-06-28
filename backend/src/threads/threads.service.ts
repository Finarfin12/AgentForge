import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { threads, threadMessages, agents } from '../database/schema';
import { eq, desc } from 'drizzle-orm';
import { CreateThreadDto } from './dto/create-thread.dto';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class ThreadsService {
  private readonly logger = new Logger(ThreadsService.name);

  constructor(
    private db: DatabaseService,
    private integrations: IntegrationsService,
  ) {}

  async create(createThreadDto: CreateThreadDto, userId: string) {
    const [thread] = await this.db.drizzle
      .insert(threads)
      .values({
        title: createThreadDto.title,
        description: createThreadDto.description,
        createdBy: userId,
      })
      .returning();
    return thread;
  }

  async findAll() {
    return this.db.drizzle.select().from(threads).orderBy(desc(threads.createdAt));
  }

  async findOne(id: string) {
    const [thread] = await this.db.drizzle
      .select()
      .from(threads)
      .where(eq(threads.id, id))
      .limit(1);
    
    if (!thread) throw new NotFoundException('Thread not found');
    return thread;
  }

  async remove(id: string) {
    const thread = await this.findOne(id);
    await this.db.drizzle.delete(threads).where(eq(threads.id, id));
    return { deleted: true, id: thread.id, title: thread.title };
  }

  async getMessages(id: string) {
    await this.findOne(id); // verify exists
    
    const results = await this.db.drizzle
      .select({
        id: threadMessages.id,
        threadId: threadMessages.threadId,
        role: threadMessages.role,
        content: threadMessages.content,
        createdAt: threadMessages.createdAt,
        agentId: threadMessages.agentId,
        agentName: agents.name,
        voteData: threadMessages.voteData,
        deliberationSessionId: threadMessages.deliberationSessionId,
      })
      .from(threadMessages)
      .leftJoin(agents, eq(threadMessages.agentId, agents.id))
      .where(eq(threadMessages.threadId, id))
      .orderBy(threadMessages.createdAt);
      
    return results;
  }

  async addMessage(id: string, role: 'user' | 'agent' | 'system', content: string, agentId?: string) {
    const thread = await this.findOne(id);
    
    const [message] = await this.db.drizzle
      .insert(threadMessages)
      .values({
        threadId: id,
        role,
        content,
        agentId,
      })
      .returning();

    // Update message count
    await this.db.drizzle
      .update(threads)
      .set({ 
        messageCount: (thread.messageCount || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(threads.id, id));

    // Auto-reply logic if message is from user
    if (role === 'user') {
      this.triggerAutoReply(id, content).catch(err => {
        this.logger.error(`Auto-reply failed for thread ${id}: ${err.message}`);
      });
    }

    return message;
  }

  private async triggerAutoReply(threadId: string, userMessage: string) {
    const mentionRegex = /@([a-zA-Z0-9_]+)/i;
    const match = userMessage.match(mentionRegex);
    let targetAgentName = match ? match[1] : null;

    let agent: any = null;

    if (targetAgentName) {
      const [found] = await this.db.drizzle
        .select()
        .from(agents)
        .where(eq(agents.name, targetAgentName))
        .limit(1);
      agent = found;
    }

    if (!agent) {
      const allAgents = await this.db.drizzle.select().from(agents);
      if (allAgents.length > 0) {
        agent = allAgents[Math.floor(Math.random() * allAgents.length)];
      }
    }
    
    if (!agent) {
      this.logger.warn(`No agents found in database to auto-reply to thread ${threadId}`);
      return;
    }

    const providerName = (agent.config as any)?.provider || 'ollama';
    const model = (agent.config as any)?.model || (providerName === 'ollama' ? 'llama3' : 'default');
    const temperature = (agent.config as any)?.temperature || 0.7;

    this.logger.log(`Auto-replying to thread ${threadId} using agent ${agent.name} (${providerName})`);

    try {
      const response = await this.integrations.chatCompletion(providerName, {
        model,
        messages: [{ role: 'user', content: userMessage }],
        temperature,
      });

      // Use a transaction to ensure messageCount stays consistent
      await this.db.drizzle.transaction(async (tx) => {
        await tx.insert(threadMessages).values({
          threadId,
          role: 'agent',
          content: response.content,
          agentId: agent.id,
        });

        const [thread] = await tx
          .select({ messageCount: threads.messageCount })
          .from(threads)
          .where(eq(threads.id, threadId))
          .limit(1);

        await tx
          .update(threads)
          .set({
            messageCount: (thread?.messageCount || 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(threads.id, threadId));
      });
    } catch (err) {
      this.logger.error(`Agent failed to reply: ${(err as Error).message}`);
    }
  }
}
