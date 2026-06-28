import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { DatabaseService } from '../database/database.service';
import { pipelines, pipelineSteps, pipelineExecutions, tasks } from '../database/schema';
import { eq, desc } from 'drizzle-orm';
import { TasksService } from '../tasks/tasks.service';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class PipelinesService {
  private readonly logger = new Logger(PipelinesService.name);

  constructor(
    private db: DatabaseService,
    private tasksService: TasksService,
    private logsService: LogsService,
  ) {}

  async create(createPipelineDto: CreatePipelineDto, userId: string) {
    const [pipeline] = await this.db.drizzle
      .insert(pipelines)
      .values({
        name: createPipelineDto.name,
        description: createPipelineDto.description,
        createdBy: userId,
        status: 'draft',
      })
      .returning();
    
    await this.logActivity(`Created pipeline: ${pipeline.name}`, 'pipeline');
    return pipeline;
  }

  async findAll() {
    return this.db.drizzle.select().from(pipelines).orderBy(desc(pipelines.createdAt));
  }

  async findOne(id: string) {
    const [pipeline] = await this.db.drizzle.select().from(pipelines).where(eq(pipelines.id, id)).limit(1);
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    return pipeline;
  }

  async update(id: string, updatePipelineDto: UpdatePipelineDto) {
    const [pipeline] = await this.db.drizzle
      .update(pipelines)
      .set({ ...updatePipelineDto, updatedAt: new Date() })
      .where(eq(pipelines.id, id))
      .returning();
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    return pipeline;
  }

  async remove(id: string) {
    const [pipeline] = await this.db.drizzle.delete(pipelines).where(eq(pipelines.id, id)).returning();
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    await this.logActivity(`Deleted pipeline: ${pipeline.name}`, 'pipeline');
    return pipeline;
  }

  // Steps
  async getSteps(pipelineId: string) {
    return this.db.drizzle.select().from(pipelineSteps).where(eq(pipelineSteps.pipelineId, pipelineId)).orderBy(pipelineSteps.stepOrder);
  }

  async addStep(pipelineId: string, data: any) {
    const steps = await this.getSteps(pipelineId);
    const order = steps.length > 0 ? steps[steps.length - 1].stepOrder! + 1 : 1;
    
    const [step] = await this.db.drizzle.insert(pipelineSteps).values({
      pipelineId,
      name: data.name,
      description: data.description,
      agentId: data.agentId,
      stepOrder: order,
      config: data.config, // { prompt: "..." }
      status: 'pending',
    }).returning();
    
    await this.db.drizzle.update(pipelines).set({ totalSteps: order, updatedAt: new Date() }).where(eq(pipelines.id, pipelineId));
    return step;
  }

  async removeStep(pipelineId: string, stepId: string) {
    const [deleted] = await this.db.drizzle.delete(pipelineSteps).where(eq(pipelineSteps.id, stepId)).returning();
    return deleted;
  }

  async getExecutions(pipelineId: string) {
    return this.db.drizzle
      .select()
      .from(pipelineExecutions)
      .where(eq(pipelineExecutions.pipelineId, pipelineId))
      .orderBy(desc(pipelineExecutions.startedAt));
  }

  // Execution Engine
  async executePipeline(pipelineId: string, inputData: string, userId: string) {
    const pipeline = await this.findOne(pipelineId);
    const steps = await this.getSteps(pipelineId);
    if (steps.length === 0) throw new Error('Pipeline has no steps');

    const [execution] = await this.db.drizzle.insert(pipelineExecutions).values({
      pipelineId,
      triggerType: 'manual',
      triggeredBy: userId,
      status: 'running',
      input: { data: inputData },
    }).returning();

    await this.db.drizzle.update(pipelines).set({ status: 'running', runCount: (pipeline.runCount || 0) + 1, lastRunAt: new Date() }).where(eq(pipelines.id, pipelineId));
    await this.logActivity(`Started pipeline execution for: ${pipeline.name}`, 'pipeline');

    // Run asynchronously to not block the request
    this.runPipelineAsync(pipelineId, execution.id, steps, inputData, userId).catch(async err => {
      this.logger.error(`Pipeline execution failed: ${err.message}`);
      await this.db.drizzle.update(pipelineExecutions).set({ status: 'failed', completedAt: new Date(), error: { message: err.message } }).where(eq(pipelineExecutions.id, execution.id));
      await this.db.drizzle.update(pipelines).set({ status: 'failed' }).where(eq(pipelines.id, pipelineId));
    });

    return execution;
  }

  private async runPipelineAsync(pipelineId: string, executionId: string, steps: any[], initialInput: string, userId: string) {
    const startedAt = new Date();
    let currentInput = initialInput;
    let failed = false;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      await this.db.drizzle.update(pipelines).set({ currentStepIndex: i + 1 }).where(eq(pipelines.id, pipelineId));
      await this.db.drizzle.update(pipelineSteps).set({ status: 'running', startedAt: new Date() }).where(eq(pipelineSteps.id, step.id));
      
      const instruction = step.config?.prompt 
        ? `${step.config.prompt}\n\nInput from previous step:\n${currentInput}`
        : currentInput;

      // Create a task for this step with assignedAgentId
      const task = await this.tasksService.create({
        title: `Pipeline: ${step.name}`,
        description: instruction,
        assignedAgentId: step.agentId!,
      }, userId);
      
      // Wait for task to finish by polling
      let taskResult: any = null;
      const maxAttempts = parseInt(process.env.PIPELINE_POLL_MAX || '60', 10);
      const pollInterval = parseInt(process.env.PIPELINE_POLL_INTERVAL || '1000', 10);
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        const checkTask = await this.tasksService.findOne(task.id);
        if (checkTask.status === 'completed' || checkTask.status === 'failed') {
          taskResult = checkTask;
          break;
        }
      }

      if (!taskResult || taskResult.status === 'failed') {
        failed = true;
        await this.db.drizzle.update(pipelineSteps).set({ status: 'failed', completedAt: new Date() }).where(eq(pipelineSteps.id, step.id));
        break;
      }

      currentInput = typeof taskResult.output === 'object' ? JSON.stringify(taskResult.output) : String(taskResult.output || 'No output');
      await this.db.drizzle.update(pipelineSteps).set({ status: 'completed', completedAt: new Date() }).where(eq(pipelineSteps.id, step.id));
    }

    const durationMs = Date.now() - startedAt.getTime();

    if (failed) {
      await this.db.drizzle.update(pipelineExecutions).set({ status: 'failed', completedAt: new Date(), error: { message: 'A step failed or timed out' }, durationMs }).where(eq(pipelineExecutions.id, executionId));
      await this.db.drizzle.update(pipelines).set({ status: 'failed' }).where(eq(pipelines.id, pipelineId));
      await this.logActivity(`Pipeline execution failed: ${pipelineId}`, 'pipeline_error');
    } else {
      await this.db.drizzle.update(pipelineExecutions).set({ status: 'completed', completedAt: new Date(), output: { data: currentInput }, durationMs }).where(eq(pipelineExecutions.id, executionId));
      await this.db.drizzle.update(pipelines).set({ status: 'completed', currentStepIndex: steps.length }).where(eq(pipelines.id, pipelineId));
      await this.logActivity(`Pipeline execution completed: ${pipelineId}`, 'pipeline_success');
    }
  }

  private async logActivity(message: string, component: string) {
    try {
      await this.logsService.create({ message, source: component, level: 'info' }, 'system');
    } catch (err) {
      this.logger.error(`Failed to write log: ${(err as Error).message}`);
    }
  }

  async findTemplates() {
    return this.db.drizzle
      .select()
      .from(pipelines)
      .where(eq(pipelines.isTemplate, true))
      .orderBy(desc(pipelines.createdAt));
  }

  async saveAsTemplate(id: string, templateName: string, userId: string) {
    const pipeline = await this.findOne(id);
    const [updated] = await this.db.drizzle
      .update(pipelines)
      .set({
        isTemplate: true,
        name: templateName,
        updatedAt: new Date(),
      })
      .where(eq(pipelines.id, id))
      .returning();
    await this.logActivity(`Saved pipeline "${templateName}" as template`, 'pipeline');
    return updated;
  }

  async createFromTemplate(templateId: string, newName: string, userId: string) {
    const template = await this.findOne(templateId);
    const steps = await this.getSteps(templateId);

    const [pipeline] = await this.db.drizzle
      .insert(pipelines)
      .values({
        name: newName || template.name,
        description: template.description,
        createdBy: userId,
        config: template.config,
        triggerType: template.triggerType,
        totalSteps: steps.length,
        status: 'draft',
      })
      .returning();

    for (const step of steps) {
      await this.db.drizzle.insert(pipelineSteps).values({
        pipelineId: pipeline.id,
        name: step.name,
        description: step.description,
        stepOrder: step.stepOrder,
        agentId: step.agentId,
        agentName: step.agentName,
        config: step.config,
        inputMapping: step.inputMapping,
      });
    }

    await this.logActivity(`Created pipeline "${pipeline.name}" from template`, 'pipeline');
    return this.findOne(pipeline.id);
  }
}
