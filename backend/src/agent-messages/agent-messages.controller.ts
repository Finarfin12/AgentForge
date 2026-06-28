import { Controller, Get, Post, Patch, Param, Body, Request, UseGuards, Query, ParseUUIDPipe } from '@nestjs/common';
import { AgentMessagesService } from './agent-messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('agent-messages')
@UseGuards(JwtAuthGuard)
export class AgentMessagesController {
  constructor(private service: AgentMessagesService) {}

  @Get('inbox')
  inbox(@Request() req) {
    // For now, user queries by agentId query param; in production, derive from user's agent
    return this.service.inbox(req.query.agentId as string);
  }

  @Get('sent')
  sent(@Request() req) {
    return this.service.sent(req.query.agentId as string);
  }

  @Get('thread/:threadId')
  thread(@Param('threadId') threadId: string) {
    return this.service.thread(threadId);
  }

  @Get('unread-count')
  unreadCount(@Query('agentId') agentId: string) {
    return this.service.unreadCount(agentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post('send')
  send(@Body() body: {
    fromAgentId: string;
    toAgentId: string;
    subject: string;
    body: string;
    type?: string;
    priority?: string;
    relatedTaskId?: string;
  }) {
    return this.service.send(body);
  }

  @Post(':id/reply')
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: {
      fromAgentId: string;
      toAgentId: string;
      subject: string;
      body: string;
      type?: string;
    },
  ) {
    return this.service.reply(id, body);
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.service.markRead(id, req.query.agentId as string);
  }

  @Patch(':id/archive')
  archive(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.service.archive(id, req.query.agentId as string);
  }
}
