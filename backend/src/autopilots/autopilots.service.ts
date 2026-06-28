import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { autopilots, autopilotTriggers, autopilotRuns, tasks, agents, settings } from '../database/schema';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { AgentsService } from '../agents/agents.service';
import { CronExpressionParser } from 'cron-parser';
import * as crypto from 'crypto';

@Injectable()
export class AutopilotsService {
  private readonly logger = new Logger(AutopilotsService.name);
  constructor(
    private db: DatabaseService,
    private agentsService: AgentsService,
  ) {}

  async findAll(status?: string) {
    const conditions: any[] = [];
    if (status && status !== 'all') conditions.push(eq(autopilots.status, status as any));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    return this.db.drizzle
      .select({
        id: autopilots.id,
        name: autopilots.name,
        description: autopilots.description,
        status: autopilots.status,
        assigneeType: autopilots.assigneeType,
        assigneeId: autopilots.assigneeId,
        executionMode: autopilots.executionMode,
        lastRunAt: autopilots.lastRunAt,
        createdAt: autopilots.createdAt,
        triggerCount: sql<number>`(SELECT COUNT(*) FROM ${autopilotTriggers} WHERE ${autopilotTriggers.autopilotId} = ${autopilots.id})`,
      })
      .from(autopilots)
      .where(where)
      .orderBy(desc(autopilots.createdAt));
  }

  async findOne(id: string) {
    const [ap] = await this.db.drizzle.select().from(autopilots).where(eq(autopilots.id, id)).limit(1);
    if (!ap) throw new NotFoundException('Autopilot not found');
    const triggers = await this.db.drizzle
      .select().from(autopilotTriggers).where(eq(autopilotTriggers.autopilotId, id));
    const runs = await this.db.drizzle
      .select().from(autopilotRuns).where(eq(autopilotRuns.autopilotId, id)).orderBy(desc(autopilotRuns.createdAt)).limit(20);
    return { ...ap, triggers, runs };
  }

  async create(data: {
    name: string; description?: string;
    assigneeType?: string; assigneeId: string;
    executionMode?: string; issueTitleTemplate?: string;
    createdBy?: string;
  }) {
    const [ap] = await this.db.drizzle
      .insert(autopilots)
      .values({
        name: data.name,
        description: data.description,
        assigneeType: data.assigneeType || 'agent',
        assigneeId: data.assigneeId,
        executionMode: data.executionMode || 'create_task',
        issueTitleTemplate: data.issueTitleTemplate,
        createdBy: data.createdBy,
      })
      .returning();
    return { ...ap, triggers: [], runs: [] };
  }

  async update(id: string, data: {
    name?: string; description?: string; status?: string;
    assigneeType?: string; assigneeId?: string;
    executionMode?: string; issueTitleTemplate?: string;
  }) {
    await this.findOne(id);
    const [updated] = await this.db.drizzle
      .update(autopilots)
      .set({ ...(data as any), updatedAt: new Date() })
      .where(eq(autopilots.id, id))
      .returning();
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.drizzle.delete(autopilots).where(eq(autopilots.id, id));
    return { deleted: true };
  }

  async toggleStatus(id: string) {
    const ap = await this.findOne(id);
    const newStatus = ap.status === 'active' ? 'paused' : 'active';
    const [updated] = await this.db.drizzle
      .update(autopilots)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(autopilots.id, id))
      .returning();
    return updated;
  }

  // Triggers
  async createTrigger(autopilotId: string, data: {
    kind: 'schedule' | 'webhook';
    cronExpression?: string; timezone?: string;
    label?: string;
  }) {
    await this.findOne(autopilotId);
    const triggerData: any = {
      autopilotId,
      kind: data.kind,
      label: data.label,
    };
    if (data.kind === 'schedule') {
      triggerData.cronExpression = data.cronExpression;
      triggerData.timezone = data.timezone || await this.getGlobalTimezone();
    } else if (data.kind === 'webhook') {
      triggerData.webhookToken = crypto.randomBytes(32).toString('hex');
    }
    const [trigger] = await this.db.drizzle
      .insert(autopilotTriggers)
      .values(triggerData)
      .returning();
    return trigger;
  }

  async updateTrigger(triggerId: string, data: {
    enabled?: boolean; cronExpression?: string; timezone?: string;
    label?: string;
  }) {
    const [updated] = await this.db.drizzle
      .update(autopilotTriggers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(autopilotTriggers.id, triggerId))
      .returning();
    if (!updated) throw new NotFoundException('Trigger not found');
    return updated;
  }

  async removeTrigger(triggerId: string) {
    await this.db.drizzle.delete(autopilotTriggers).where(eq(autopilotTriggers.id, triggerId));
    return { deleted: true };
  }

  // Execution
  async dispatch(autopilotId: string, source: string, triggerId?: string, payload?: any) {
    const ap = await this.findOne(autopilotId);
    if (ap.status !== 'active') throw new Error('Autopilot is not active');

    const runData: any = {
      autopilotId,
      source,
      triggerId: triggerId || null,
      triggerPayload: payload || null,
      status: 'pending',
    };

    const [run] = await this.db.drizzle.insert(autopilotRuns).values(runData).returning();

    try {
      const assigneeId = ap.assigneeId;
      if (!assigneeId) throw new Error('No assignee configured');

      let agentId = assigneeId;
      if (ap.assigneeType === 'squad') {
        const [squadResult]: any = await this.db.drizzle.execute(
          sql`SELECT leader_id FROM squads WHERE id = ${assigneeId} AND archived_at IS NULL`
        );
        if (!squadResult?.leader_id) throw new Error('Squad not found or archived');
        agentId = squadResult.leader_id;
      }

      const prompt = ap.issueTitleTemplate || `Execute: ${ap.name}`;
      const result = await this.agentsService.invoke(agentId, { prompt, maxTokens: 4096, temperature: 0.7 });

      const [task] = await this.db.drizzle
        .insert(tasks)
        .values({
          title: `Autopilot: ${ap.name}`,
          description: ap.description || '',
          assignedAgentId: agentId,
          createdBy: ap.createdBy!,
          status: 'completed',
          output: { content: result.content },
          completedAt: new Date(),
        })
        .returning();

      await this.db.drizzle
        .update(autopilotRuns)
        .set({ status: 'completed', taskId: task.id, result: { content: result.content }, completedAt: new Date() })
        .where(eq(autopilotRuns.id, run.id));

      await this.db.drizzle
        .update(autopilots)
        .set({ lastRunAt: new Date(), updatedAt: new Date() })
        .where(eq(autopilots.id, autopilotId));

      if (triggerId) {
        await this.db.drizzle
          .update(autopilotTriggers)
          .set({ lastFiredAt: new Date(), updatedAt: new Date() })
          .where(eq(autopilotTriggers.id, triggerId));
      }

      return { runId: run.id, taskId: task.id, result: result.content };
    } catch (err) {
      await this.db.drizzle
        .update(autopilotRuns)
        .set({ status: 'failed', failureReason: (err as Error).message, completedAt: new Date() })
        .where(eq(autopilotRuns.id, run.id));
      throw err;
    }
  }

  async getRuns(autopilotId: string, limit = 50) {
    return this.db.drizzle
      .select().from(autopilotRuns)
      .where(eq(autopilotRuns.autopilotId, autopilotId))
      .orderBy(desc(autopilotRuns.createdAt))
      .limit(limit);
  }

  async getStats() {
    const [total] = await this.db.drizzle.select({ count: sql<number>`count(*)` }).from(autopilots);
    const [active] = await this.db.drizzle.select({ count: sql<number>`count(*)` }).from(autopilots).where(eq(autopilots.status, 'active'));
    const [totalRuns] = await this.db.drizzle.select({ count: sql<number>`count(*)` }).from(autopilotRuns);
    return { total: Number(total.count), active: Number(active.count), totalRuns: Number(totalRuns.count) };
  }

  private async getGlobalTimezone(): Promise<string> {
    try {
      const [row] = await this.db.drizzle
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, 'timezone'))
        .limit(1);
      if (row?.value && typeof row.value === 'string') return row.value;
    } catch {}
    return 'UTC';
  }

  // Scheduled trigger checker
  async checkDueSchedules(): Promise<number> {
    const triggers = await this.db.drizzle
      .select({
        id: autopilotTriggers.id,
        autopilotId: autopilotTriggers.autopilotId,
        cronExpression: autopilotTriggers.cronExpression,
        timezone: autopilotTriggers.timezone,
        lastFiredAt: autopilotTriggers.lastFiredAt,
        autopilotStatus: autopilots.status,
      })
      .from(autopilotTriggers)
      .innerJoin(autopilots, eq(autopilots.id, autopilotTriggers.autopilotId))
      .where(and(
        eq(autopilotTriggers.kind, 'schedule'),
        eq(autopilotTriggers.enabled, true),
        eq(autopilots.status, 'active'),
      ));

    const globalTz = await this.getGlobalTimezone();
    let dispatched = 0;
    const now = new Date();

    for (const t of triggers) {
      if (!t.cronExpression) continue;
      try {
        const interval = CronExpressionParser.parse(t.cronExpression, { tz: t.timezone || globalTz });
        const next = interval.next().toDate();
        if (next <= now) {
          await this.dispatch(t.autopilotId, 'schedule', t.id);
          dispatched++;
        }
      } catch (err) {
        this.logger.warn(`Failed to evaluate cron for trigger ${t.id}: ${(err as Error).message}`);
      }
    }
    return dispatched;
  }
}
