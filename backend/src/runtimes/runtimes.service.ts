import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { agentRuntimes } from '../database/schema';
import { eq, desc, and, sql, or, isNull } from 'drizzle-orm';

@Injectable()
export class RuntimesService {
  private readonly logger = new Logger(RuntimesService.name);
  constructor(private db: DatabaseService) {}

  async findAll(ownerId?: string) {
    let q = this.db.drizzle.select().from(agentRuntimes).orderBy(desc(agentRuntimes.lastSeenAt));
    if (ownerId) {
      (q as any).where(eq(agentRuntimes.createdBy, ownerId));
    }
    return q;
  }

  async findOne(id: string) {
    const [rt] = await this.db.drizzle.select().from(agentRuntimes).where(eq(agentRuntimes.id, id)).limit(1);
    if (!rt) throw new NotFoundException('Runtime not found');
    return rt;
  }

  async getStats() {
    const [total] = await this.db.drizzle.select({ count: sql<number>`count(*)` }).from(agentRuntimes);
    const [online] = await this.db.drizzle.select({ count: sql<number>`count(*)` }).from(agentRuntimes).where(eq(agentRuntimes.status, 'online'));
    const providers = await this.db.drizzle.select({ provider: agentRuntimes.provider, count: sql<number>`count(*)` }).from(agentRuntimes).groupBy(agentRuntimes.provider);
    return { total: Number(total.count), online: Number(online.count), providers };
  }

  async register(data: {
    name: string; provider: string; mode?: 'local' | 'cloud';
    daemonId?: string; deviceName?: string; version?: string; metadata?: Record<string, unknown>;
    createdBy?: string;
  }) {
    const existing = await this.db.drizzle
      .select()
      .from(agentRuntimes)
      .where(and(
        eq(agentRuntimes.provider, data.provider),
        data.daemonId ? eq(agentRuntimes.daemonId, data.daemonId) : isNull(agentRuntimes.daemonId),
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await this.db.drizzle
        .update(agentRuntimes)
        .set({ status: 'online', lastSeenAt: new Date(), deviceName: data.deviceName, version: data.version, metadata: data.metadata as any, updatedAt: new Date() })
        .where(eq(agentRuntimes.id, existing[0].id))
        .returning();
      return updated;
    }

    const [rt] = await this.db.drizzle
      .insert(agentRuntimes)
      .values({
        name: data.name,
        provider: data.provider,
        mode: data.mode || 'local',
        daemonId: data.daemonId,
        deviceName: data.deviceName,
        version: data.version,
        status: 'online',
        lastSeenAt: new Date(),
        metadata: data.metadata as any,
        createdBy: data.createdBy,
      })
      .returning();
    return rt;
  }

  async heartbeat(id: string) {
    const [updated] = await this.db.drizzle
      .update(agentRuntimes)
      .set({ status: 'online', lastSeenAt: new Date(), updatedAt: new Date() })
      .where(eq(agentRuntimes.id, id))
      .returning();
    if (!updated) throw new NotFoundException('Runtime not found');
    return updated;
  }

  async markOffline(id: string) {
    const [updated] = await this.db.drizzle
      .update(agentRuntimes)
      .set({ status: 'offline', updatedAt: new Date() })
      .where(eq(agentRuntimes.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.drizzle.delete(agentRuntimes).where(eq(agentRuntimes.id, id));
    return { deleted: true };
  }

  async detectLocalCLIs(): Promise<{ name: string; path: string; provider: string; version: string }[]> {
    const discovered: { name: string; path: string; provider: string; version: string }[] = [];
    const clis = [
      { name: 'opencode', provider: 'opencode' },
      { name: 'codex', provider: 'codex' },
      { name: 'claude', provider: 'claude' },
      { name: 'hermes', provider: 'hermes' },
      { name: 'codebuddy', provider: 'codebuddy' },
      { name: 'copilot', provider: 'copilot' },
      { name: 'openclaw', provider: 'openclaw' },
      { name: 'gemini', provider: 'gemini' },
      { name: 'pi', provider: 'pi' },
      { name: 'cursor-agent', provider: 'cursor' },
      { name: 'kimi', provider: 'kimi' },
      { name: 'kiro-cli', provider: 'kiro' },
      { name: 'antigravity', provider: 'antigravity' },
      { name: 'agy', provider: 'agy' },
      { name: 'qodercli', provider: 'qoder' },
    ];

    const { execSync } = require('child_process');
    for (const cli of clis) {
      try {
        const which = process.platform === 'win32' ? 'where' : 'which';
        const path = execSync(`${which} ${cli.name} 2>nul || echo NOT_FOUND`, { encoding: 'utf-8', shell: true }).trim();
        if (path && path !== 'NOT_FOUND' && !path.includes('NOT_FOUND')) {
          const versionLine = execSync(`${cli.name} --version 2>nul || echo unknown`, { encoding: 'utf-8', shell: true }).trim();
          const version = versionLine !== 'unknown' ? versionLine.split('\n')[0].trim() : 'unknown';
          discovered.push({ name: cli.name, path: path.split('\n')[0].trim(), provider: cli.provider, version });
        }
      } catch { /* not found */ }
    }
    return discovered;
  }
}
