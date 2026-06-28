import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseUUIDPipe, Req, Query, Logger } from '@nestjs/common';
import { AutopilotsService } from './autopilots.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DatabaseService } from '../database/database.service';
import { autopilotTriggers } from '../database/schema';
import { eq } from 'drizzle-orm';

@Controller('autopilots')
export class AutopilotsController {
  private readonly logger = new Logger(AutopilotsController.name);
  constructor(
    private service: AutopilotsService,
    private db: DatabaseService,
  ) {}

  @Get('stats')
  stats() { return this.service.getStats(); }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('status') status?: string) { return this.service.findAll(status); }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.service.findOne(id); }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: {
    name: string; description?: string;
    assigneeType?: string; assigneeId: string;
    executionMode?: string; issueTitleTemplate?: string;
  }, @Req() req: any) {
    return this.service.create({ ...body, createdBy: req.user?.userId });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: {
    name?: string; description?: string; status?: string;
    assigneeType?: string; assigneeId?: string;
    executionMode?: string; issueTitleTemplate?: string;
  }) { return this.service.update(id, body); }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) { return this.service.remove(id); }

  @UseGuards(JwtAuthGuard)
  @Post(':id/toggle')
  toggle(@Param('id', ParseUUIDPipe) id: string) { return this.service.toggleStatus(id); }

  // Triggers
  @UseGuards(JwtAuthGuard)
  @Post(':id/triggers')
  addTrigger(@Param('id', ParseUUIDPipe) id: string, @Body() body: {
    kind: 'schedule' | 'webhook';
    cronExpression?: string; timezone?: string; label?: string;
  }) { return this.service.createTrigger(id, body); }

  @UseGuards(JwtAuthGuard)
  @Patch('triggers/:triggerId')
  updateTrigger(@Param('triggerId', ParseUUIDPipe) triggerId: string, @Body() body: {
    enabled?: boolean; cronExpression?: string; timezone?: string; label?: string;
  }) { return this.service.updateTrigger(triggerId, body); }

  @UseGuards(JwtAuthGuard)
  @Delete('triggers/:triggerId')
  removeTrigger(@Param('triggerId', ParseUUIDPipe) triggerId: string) { return this.service.removeTrigger(triggerId); }

  // Dispatch
  @UseGuards(JwtAuthGuard)
  @Post(':id/dispatch')
  dispatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.dispatch(id, 'manual');
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/runs')
  getRuns(@Param('id', ParseUUIDPipe) id: string) { return this.service.getRuns(id); }

  // Public webhook endpoint (no auth, token is credential)
  @Post('webhook/:token')
  async webhook(@Param('token') token: string, @Body() body: any) {
    try {
      const triggers = await this.db.drizzle
        .select()
        .from(autopilotTriggers)
        .where(eq(autopilotTriggers.webhookToken, token))
        .limit(1);
      const trigger = triggers[0];
      if (!trigger) return { error: 'invalid_token' };
      await this.service.dispatch(trigger.autopilotId, 'webhook', trigger.id, body);
      return { ok: true };
    } catch (err) {
      this.logger.error(`Webhook error: ${(err as Error).message}`);
      return { error: 'dispatch_failed' };
    }
  }
}
