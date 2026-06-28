import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { tasks, agents } from '../database/schema';
import { eq } from 'drizzle-orm';
import { TASK_QUEUE } from './tasks.service';
import { IntegrationsService } from '../integrations/integrations.service';

@Processor(TASK_QUEUE)
export class TasksProcessor extends WorkerHost {
  private readonly logger = new Logger(TasksProcessor.name);

  constructor(
    private db: DatabaseService,
    private integrations: IntegrationsService,
  ) {
    super();
  }

  async process(job: Job) {
    const { taskId, assignedAgentId } = job.data;
    this.logger.log(`Processing task ${taskId} assigned to agent ${assignedAgentId}`);

    try {
      // Mark task as running
      await this.db.drizzle
        .update(tasks)
        .set({ status: 'running', updatedAt: new Date() })
        .where(eq(tasks.id, taskId));

      // Fetch task details
      const [task] = await this.db.drizzle
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (!task) throw new Error('Task not found');

      // Fetch assigned agent
      let outputText = '';
      
      if (assignedAgentId) {
        const [agent] = await this.db.drizzle
          .select()
          .from(agents)
          .where(eq(agents.id, assignedAgentId))
          .limit(1);
          
        if (!agent) throw new Error('Assigned agent not found');
        
        const providerName = (agent.config as any)?.provider || 'ollama';
        const model = (agent.config as any)?.model || 'default';
        const temperature = (agent.config as any)?.temperature || 0.7;
        
        this.logger.log(`Calling AI provider: ${providerName} (model: ${model})`);
        
        const response = await this.integrations.chatCompletion(providerName, {
          model,
          messages: [{ role: 'user', content: task.description || task.title }],
          temperature,
        });
        
        outputText = response.content;
      } else {
        // Auto-delegation or generic processing
        this.logger.log(`No agent assigned. Marking task as auto-completed for now.`);
        outputText = 'Task completed (No specific agent assigned).';
      }

      // Mark task as completed
      await this.db.drizzle
        .update(tasks)
        .set({ 
          status: 'completed', 
          output: { result: outputText },
          updatedAt: new Date() 
        })
        .where(eq(tasks.id, taskId));

      this.logger.log(`Task ${taskId} completed successfully`);
      return { taskId, status: 'completed' };
    } catch (err) {
      this.logger.error(`Task ${taskId} failed: ${(err as Error).message}`);

      await this.db.drizzle
        .update(tasks)
        .set({
          status: 'failed',
          error: { message: (err as Error).message },
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId));

      throw err;
    }
  }
}
