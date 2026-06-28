import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DatabaseService } from '../database/database.service';
import { tasks } from '../database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

export const TASK_QUEUE = 'tasks';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private db: DatabaseService,
    @InjectQueue(TASK_QUEUE)
    private taskQueue: Queue,
  ) {}

  async findAll(filters?: { status?: string; assignedAgentId?: string }) {
    let q = this.db.drizzle.select().from(tasks);
    const conditions: ReturnType<typeof eq>[] = [];

    if (filters?.status) {
      conditions.push(eq(tasks.status, sql`${filters.status}::task_status`));
    }
    if (filters?.assignedAgentId) {
      conditions.push(eq(tasks.assignedAgentId, filters.assignedAgentId));
    }

    if (conditions.length > 0) {
      (q as any).where(and(...conditions));
    }
    return q;
  }

  async findOne(id: string) {
    const [task] = await this.db.drizzle
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async create(dto: CreateTaskDto, createdBy: string) {
    const [task] = await this.db.drizzle
      .insert(tasks)
      .values({
        title: dto.title,
        description: dto.description,
        priority: dto.priority ?? 0,
        createdBy,
        assignedAgentId: dto.assignedAgentId,
        input: dto.input ?? {},
          metadata: dto.metadata ?? {},
      })
      .returning();

    // Enqueue to BullMQ
    await this.taskQueue.add(
      'process-task',
      { taskId: task.id, assignedAgentId: task.assignedAgentId },
      {
        priority: dto.priority ?? 0,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    return task;
  }

  async update(id: string, dto: UpdateTaskDto) {
    await this.findOne(id);

    const [updated] = await this.db.drizzle
      .update(tasks)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    return updated;
  }

  async cancel(id: string) {
    const task = await this.findOne(id);

    if (['completed', 'cancelled'].includes(task.status!)) {
      throw new BadRequestException(`Cannot cancel a ${task.status} task`);
    }

    const [updated] = await this.db.drizzle
      .update(tasks)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    // Remove from queue if still pending
    const jobs = await this.taskQueue.getJobs();
    const job = jobs.find(j => j.data.taskId === id);
    if (job) await job.remove();

    return updated;
  }

  async retry(id: string) {
    const task = await this.findOne(id);
    if (task.status !== 'failed') {
      throw new BadRequestException('Only failed tasks can be retried');
    }

    const [updated] = await this.db.drizzle
      .update(tasks)
      .set({
        status: 'pending',
        error: null,
        output: null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    await this.taskQueue.add(
      'process-task',
      { taskId: task.id, assignedAgentId: task.assignedAgentId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    return updated;
  }

  async assign(id: string, agentId: string) {
    await this.findOne(id);

    const [updated] = await this.db.drizzle
      .update(tasks)
      .set({ assignedAgentId: agentId, status: 'assigned', updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    // Update BullMQ job data if a pending job exists
    const jobs = await this.taskQueue.getJobs();
    const job = jobs.find(j => j.data.taskId === id);
    if (job) {
      await job.updateData({ taskId: id, assignedAgentId: agentId });
    }

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.drizzle
      .delete(tasks)
      .where(eq(tasks.id, id));
    return { deleted: true };
  }
}
