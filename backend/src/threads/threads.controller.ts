import { Controller, Get, Post, Delete, Body, Param, Request, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('threads')
@UseGuards(JwtAuthGuard)
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Post()
  create(@Body() body: { title: string, description?: string }, @Request() req) {
    return this.threadsService.create(body, req.user.userId);
  }

  @Get()
  findAll() {
    return this.threadsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.threadsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.threadsService.remove(id);
  }

  @Get(':id/messages')
  getMessages(@Param('id', ParseUUIDPipe) id: string) {
    return this.threadsService.getMessages(id);
  }

  @Post(':id/messages')
  addMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { role: 'user' | 'agent' | 'system', content: string, agentId?: string }
  ) {
    return this.threadsService.addMessage(id, body.role, body.content, body.agentId);
  }
}
