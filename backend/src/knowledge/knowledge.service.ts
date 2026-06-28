import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { agentMemories } from '../database/schema';
import { eq, desc, and, sql, ilike } from 'drizzle-orm';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class KnowledgeService {
  constructor(
    private db: DatabaseService,
    private integrations: IntegrationsService,
  ) {}

  async findAll(agentId?: string, limit = 50) {
    const conditions: any[] = [];
    if (agentId) conditions.push(eq(agentMemories.agentId, agentId));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    return this.db.drizzle
      .select()
      .from(agentMemories)
      .where(where)
      .orderBy(desc(agentMemories.createdAt))
      .limit(limit);
  }

  async findOne(id: string) {
    const [memory] = await this.db.drizzle.select().from(agentMemories).where(eq(agentMemories.id, id)).limit(1);
    if (!memory) throw new NotFoundException('Memory not found');
    return memory;
  }

  async create(data: { agentId: string; content: string; taskId?: string; metadata?: Record<string, unknown> }) {
    const [memory] = await this.db.drizzle
      .insert(agentMemories)
      .values({
        agentId: data.agentId,
        content: data.content,
        taskId: data.taskId,
        metadata: data.metadata ?? {},
      })
      .returning();
    return memory;
  }

  async update(id: string, data: { content?: string; metadata?: Record<string, unknown> }) {
    await this.findOne(id);
    const [updated] = await this.db.drizzle
      .update(agentMemories)
      .set({ ...data, metadata: data.metadata as any })
      .where(eq(agentMemories.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.drizzle.delete(agentMemories).where(eq(agentMemories.id, id));
    return { deleted: true };
  }

  async search(query: string, agentId?: string) {
    const conditions = [ilike(agentMemories.content, `%${query}%`)];
    if (agentId) conditions.push(eq(agentMemories.agentId, agentId));
    return this.db.drizzle
      .select()
      .from(agentMemories)
      .where(and(...conditions))
      .orderBy(desc(agentMemories.createdAt))
      .limit(20);
  }

  async getStats() {
    const [totalResult] = await this.db.drizzle
      .select({ count: sql<number>`count(*)` })
      .from(agentMemories);
    return { totalMemories: Number(totalResult.count) };
  }
}
