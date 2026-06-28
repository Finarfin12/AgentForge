import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../logs/audit.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private tasksService: TasksService,
    private auditService: AuditService,
  ) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('assignedAgentId') assignedAgentId?: string,
  ) {
    return this.tasksService.findAll({ status, assignedAgentId });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser('userId') userId: string,
  ) {
    const result = await this.tasksService.create(dto, userId);
    this.auditService.record({ action: `Created task: ${result.title}`, entityType: 'task', entityId: result.id, userId });
    return result;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const result = await this.tasksService.update(id, dto);
    this.auditService.record({ action: `Updated task ${id}`, entityType: 'task', entityId: id, userId: 'system' });
    return result;
  }

  @Post(':id/cancel')
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.tasksService.cancel(id);
    this.auditService.record({ action: `Cancelled task ${id}`, entityType: 'task', entityId: id, userId: 'system' });
    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('userId') userId: string) {
    const result = await this.tasksService.remove(id);
    this.auditService.record({ action: `Deleted task ${id}`, entityType: 'task', entityId: id, userId });
    return result;
  }

  @Post(':id/retry')
  retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.retry(id);
  }

  @Post(':id/assign/:agentId')
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const result = await this.tasksService.assign(id, agentId);
    this.auditService.record({ action: `Assigned task ${id} to agent ${agentId}`, entityType: 'task', entityId: id, userId });
    return result;
  }
}
