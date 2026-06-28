import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private service: KnowledgeService) {}

  @Get()
  findAll(@Query('agentId') agentId?: string, @Query('limit') limit?: string) {
    return this.service.findAll(agentId, limit ? parseInt(limit) : 50);
  }

  @Get('stats')
  stats() { return this.service.getStats(); }

  @Get('search')
  search(@Query('q') q: string, @Query('agentId') agentId?: string) {
    return this.service.search(q, agentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() body: { agentId: string; content: string; taskId?: string; metadata?: Record<string, unknown> }) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: { content?: string; metadata?: Record<string, unknown> }) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) { return this.service.remove(id); }
}
