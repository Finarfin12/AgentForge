import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { agents, tasks, threads, pipelines } from '../database/schema';
import { ilike, or, sql } from 'drizzle-orm';

@Injectable()
export class SearchService {
  constructor(private db: DatabaseService) {}

  async search(query: string) {
    const s = `%${query}%`;

    const [agentResults, taskResults, threadResults, pipelineResults] = await Promise.all([
      this.db.drizzle
        .select({ id: agents.id, name: agents.displayName, type: sql<string>`'agent'`, description: agents.description })
        .from(agents)
        .where(or(ilike(agents.name, s), ilike(agents.displayName, s), ilike(agents.description ?? '', s)))
        .limit(5),

      this.db.drizzle
        .select({ id: tasks.id, name: tasks.title, type: sql<string>`'task'`, description: tasks.description })
        .from(tasks)
        .where(or(ilike(tasks.title, s), ilike(tasks.description ?? '', s)))
        .limit(5),

      this.db.drizzle
        .select({ id: threads.id, name: threads.title, type: sql<string>`'thread'`, description: threads.description })
        .from(threads)
        .where(or(ilike(threads.title, s), ilike(threads.description ?? '', s)))
        .limit(5),

      this.db.drizzle
        .select({ id: pipelines.id, name: pipelines.name, type: sql<string>`'pipeline'`, description: pipelines.description })
        .from(pipelines)
        .where(or(ilike(pipelines.name, s), ilike(pipelines.description ?? '', s)))
        .limit(5),
    ]);

    const all = [...agentResults, ...taskResults, ...threadResults, ...pipelineResults];
    return all;
  }
}
