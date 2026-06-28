import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { skills, skillFiles, agentSkills, agents } from '../database/schema';
import { eq, desc, and, sql, ilike, or } from 'drizzle-orm';

@Injectable()
export class SkillsService {
  constructor(private db: DatabaseService) {}

  async findAll(origin?: string, agentId?: string) {
    let query = this.db.drizzle
      .select({
        id: skills.id,
        name: skills.name,
        description: skills.description,
        origin: skills.origin,
        createdAt: skills.createdAt,
        updatedAt: skills.updatedAt,
      })
      .from(skills)
      .orderBy(desc(skills.createdAt));

    if (origin) {
      query = query.where(eq(skills.origin, origin as any)) as any;
    }
    if (agentId) {
      query = this.db.drizzle
        .select({
          id: skills.id,
          name: skills.name,
          description: skills.description,
          origin: skills.origin,
          createdAt: skills.createdAt,
          updatedAt: skills.updatedAt,
        })
        .from(skills)
        .innerJoin(agentSkills, eq(agentSkills.skillId, skills.id))
        .where(eq(agentSkills.agentId, agentId))
        .orderBy(desc(skills.createdAt)) as any;
    }

    const rows = await query;
    const result: any[] = [];
    for (const row of rows) {
      const [fc] = await this.db.drizzle.select({ count: sql<number>`count(*)` }).from(skillFiles).where(eq(skillFiles.skillId, row.id));
      const [ac] = await this.db.drizzle.select({ count: sql<number>`count(*)` }).from(agentSkills).where(eq(agentSkills.skillId, row.id));
      result.push({ ...row, fileCount: Number(fc.count), agentCount: Number(ac.count) });
    }
    return result;
  }

  async findOne(id: string) {
    const [skill] = await this.db.drizzle.select().from(skills).where(eq(skills.id, id)).limit(1);
    if (!skill) throw new NotFoundException('Skill not found');

    const files = await this.db.drizzle
      .select().from(skillFiles).where(eq(skillFiles.skillId, id));

    const assignedAgents = await this.db.drizzle
      .select({ agentId: agentSkills.agentId, agentName: agents.displayName })
      .from(agentSkills)
      .leftJoin(agents, eq(agents.id, agentSkills.agentId))
      .where(eq(agentSkills.skillId, id));

    return { ...skill, files, assignedAgents };
  }

  async create(data: {
    name: string; description?: string; content?: string;
    config?: Record<string, unknown>; origin?: string; createdBy?: string;
  }) {
    const [skill] = await this.db.drizzle
      .insert(skills)
      .values({
        name: data.name,
        description: data.description || '',
        content: data.content || '',
        config: data.config || {},
        origin: (data.origin as any) || 'custom',
        createdBy: data.createdBy,
      })
      .returning();
    return { ...skill, files: [], assignedAgents: [] };
  }

  async update(id: string, data: {
    name?: string; description?: string; content?: string;
    config?: Record<string, unknown>;
  }) {
    await this.findOne(id);
    const [updated] = await this.db.drizzle
      .update(skills)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(skills.id, id))
      .returning();
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.drizzle.delete(skills).where(eq(skills.id, id));
    return { deleted: true };
  }

  async search(query: string) {
    if (!query?.trim()) return this.findAll();
    return this.db.drizzle
      .select()
      .from(skills)
      .where(
        or(
          ilike(skills.name, `%${query}%`),
          ilike(skills.description, `%${query}%`),
          ilike(skills.content, `%${query}%`),
        )
      )
      .orderBy(desc(skills.createdAt))
      .limit(20);
  }

  async getStats() {
    const [total] = await this.db.drizzle.select({ count: sql<number>`count(*)` }).from(skills);
    const byOrigin = await this.db.drizzle
      .select({ origin: skills.origin, count: sql<number>`count(*)` })
      .from(skills)
      .groupBy(skills.origin);
    return { total: Number(total.count), byOrigin };
  }

  // Files
  async addFile(skillId: string, data: { path: string; content: string }) {
    await this.findOne(skillId);
    const [file] = await this.db.drizzle
      .insert(skillFiles)
      .values({ skillId, path: data.path, content: data.content })
      .returning();
    return file;
  }

  async removeFile(fileId: string) {
    await this.db.drizzle.delete(skillFiles).where(eq(skillFiles.id, fileId));
    return { deleted: true };
  }

  // Assign to agent
  async assignToAgent(skillId: string, agentId: string) {
    await this.findOne(skillId);
    const [agent] = await this.db.drizzle.select().from(agents).where(eq(agents.id, agentId)).limit(1);
    if (!agent) throw new NotFoundException('Agent not found');

    const existing = await this.db.drizzle
      .select()
      .from(agentSkills)
      .where(and(eq(agentSkills.skillId, skillId), eq(agentSkills.agentId, agentId)))
      .limit(1);
    if (existing.length > 0) return existing[0];

    const [ass] = await this.db.drizzle
      .insert(agentSkills)
      .values({ skillId, agentId })
      .returning();
    return ass;
  }

  async unassignFromAgent(skillId: string, agentId: string) {
    await this.db.drizzle
      .delete(agentSkills)
      .where(and(eq(agentSkills.skillId, skillId), eq(agentSkills.agentId, agentId)));
    return { deleted: true };
  }

  // Get skills for an agent
  async getAgentSkills(agentId: string) {
    return this.db.drizzle
      .select({
        id: skills.id,
        name: skills.name,
        description: skills.description,
        origin: skills.origin,
      })
      .from(skills)
      .innerJoin(agentSkills, eq(agentSkills.skillId, skills.id))
      .where(eq(agentSkills.agentId, agentId));
  }
}
