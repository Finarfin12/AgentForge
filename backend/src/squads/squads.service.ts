import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { squads, squadMembers, agents } from '../database/schema';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';

@Injectable()
export class SquadsService {
  constructor(private db: DatabaseService) {}

  async findAll() {
    const rows = await this.db.drizzle
      .select({
        id: squads.id,
        name: squads.name,
        description: squads.description,
        instructions: squads.instructions,
        leaderId: squads.leaderId,
        leaderName: agents.displayName,
        avatarUrl: squads.avatarUrl,
        archivedAt: squads.archivedAt,
        createdBy: squads.createdBy,
        createdAt: squads.createdAt,
        memberCount: sql<number>`(SELECT COUNT(*) FROM ${squadMembers} WHERE ${squadMembers.squadId} = ${squads.id})`,
      })
      .from(squads)
      .leftJoin(agents, eq(agents.id, squads.leaderId))
      .where(isNull(squads.archivedAt))
      .orderBy(squads.name);

    return rows;
  }

  async findAllArchived() {
    const rows = await this.db.drizzle
      .select({
        id: squads.id,
        name: squads.name,
        description: squads.description,
        leaderId: squads.leaderId,
        leaderName: agents.displayName,
        archivedAt: squads.archivedAt,
        memberCount: sql<number>`(SELECT COUNT(*) FROM ${squadMembers} WHERE ${squadMembers.squadId} = ${squads.id})`,
      })
      .from(squads)
      .leftJoin(agents, eq(agents.id, squads.leaderId))
      .where(sql`${squads.archivedAt} IS NOT NULL`)
      .orderBy(desc(squads.archivedAt));

    return rows;
  }

  async findOne(id: string) {
    const [squad] = await this.db.drizzle
      .select({
        id: squads.id,
        name: squads.name,
        description: squads.description,
        instructions: squads.instructions,
        leaderId: squads.leaderId,
        avatarUrl: squads.avatarUrl,
        archivedAt: squads.archivedAt,
        createdBy: squads.createdBy,
        createdAt: squads.createdAt,
        updatedAt: squads.updatedAt,
      })
      .from(squads)
      .where(eq(squads.id, id))
      .limit(1);

    if (!squad) throw new NotFoundException('Squad not found');

    const members = await this.db.drizzle
      .select({
        agentId: squadMembers.agentId,
        role: squadMembers.role,
        addedAt: squadMembers.addedAt,
        agentName: agents.displayName,
        agentStatus: agents.status,
      })
      .from(squadMembers)
      .leftJoin(agents, eq(agents.id, squadMembers.agentId))
      .where(eq(squadMembers.squadId, id));

    return { ...squad, members };
  }

  async create(data: {
    name: string; description?: string; instructions?: string;
    leaderId: string; avatarUrl?: string; createdBy?: string;
  }) {
    const [leader] = await this.db.drizzle.select({ id: agents.id }).from(agents).where(eq(agents.id, data.leaderId)).limit(1);
    if (!leader) throw new BadRequestException('Leader agent not found');

    const [squad] = await this.db.drizzle
      .insert(squads)
      .values({
        name: data.name,
        description: data.description || '',
        instructions: data.instructions || '',
        leaderId: data.leaderId,
        avatarUrl: data.avatarUrl,
        createdBy: data.createdBy,
      })
      .returning();

    return { ...squad, members: [] };
  }

  async update(id: string, data: {
    name?: string; description?: string; instructions?: string;
    leaderId?: string; avatarUrl?: string;
  }) {
    await this.findOne(id);
    if (data.leaderId) {
      const [leader] = await this.db.drizzle.select({ id: agents.id }).from(agents).where(eq(agents.id, data.leaderId)).limit(1);
      if (!leader) throw new BadRequestException('Leader agent not found');
    }
    const [updated] = await this.db.drizzle
      .update(squads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(squads.id, id))
      .returning();
    return this.findOne(id);
  }

  async archive(id: string, archivedBy?: string) {
    await this.findOne(id);
    const [updated] = await this.db.drizzle
      .update(squads)
      .set({ archivedAt: new Date(), archivedBy, updatedAt: new Date() })
      .where(eq(squads.id, id))
      .returning();
    return updated;
  }

  async restore(id: string) {
    await this.findOne(id);
    const [updated] = await this.db.drizzle
      .update(squads)
      .set({ archivedAt: null, archivedBy: null, updatedAt: new Date() })
      .where(eq(squads.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.drizzle.delete(squads).where(eq(squads.id, id));
    return { deleted: true };
  }

  async addMember(squadId: string, agentId: string, role?: string) {
    await this.findOne(squadId);
    const [agent] = await this.db.drizzle.select({ id: agents.id }).from(agents).where(eq(agents.id, agentId)).limit(1);
    if (!agent) throw new BadRequestException('Agent not found');

    const existing = await this.db.drizzle
      .select()
      .from(squadMembers)
      .where(and(eq(squadMembers.squadId, squadId), eq(squadMembers.agentId, agentId)))
      .limit(1);

    if (existing.length > 0) return existing[0];

    const [member] = await this.db.drizzle
      .insert(squadMembers)
      .values({ squadId, agentId, role: role || 'member' })
      .returning();
    return member;
  }

  async removeMember(squadId: string, agentId: string) {
    await this.findOne(squadId);
    const result = await this.db.drizzle
      .delete(squadMembers)
      .where(and(eq(squadMembers.squadId, squadId), eq(squadMembers.agentId, agentId)))
      .returning();
    if (result.length === 0) throw new NotFoundException('Member not found');
    return { deleted: true };
  }

  async getMemberStatus(id: string) {
    const squad = await this.findOne(id);
    return squad.members.map((m: any) => ({
      agentId: m.agentId,
      agentName: m.agentName,
      agentStatus: m.agentStatus,
    }));
  }
}
