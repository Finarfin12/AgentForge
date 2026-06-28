import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseUUIDPipe, Req } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('skills')
@UseGuards(JwtAuthGuard)
export class SkillsController {
  constructor(private service: SkillsService) {}

  @Get()
  findAll(@Query('origin') origin?: string, @Query('agentId') agentId?: string) {
    return this.service.findAll(origin, agentId);
  }

  @Get('stats')
  stats() { return this.service.getStats(); }

  @Get('search')
  search(@Query('q') q: string) { return this.service.search(q); }

  @Get('agent/:agentId')
  getAgentSkills(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.service.getAgentSkills(agentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() body: {
    name: string; description?: string; content?: string;
    config?: Record<string, unknown>; origin?: string;
  }, @Req() req: any) {
    return this.service.create({ ...body, createdBy: req.user?.userId });
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: {
    name?: string; description?: string; content?: string; config?: Record<string, unknown>;
  }) { return this.service.update(id, body); }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) { return this.service.remove(id); }

  // Files
  @Post(':id/files')
  addFile(@Param('id', ParseUUIDPipe) id: string, @Body() body: { path: string; content: string }) {
    return this.service.addFile(id, body);
  }

  @Delete('files/:fileId')
  removeFile(@Param('fileId', ParseUUIDPipe) fileId: string) { return this.service.removeFile(fileId); }

  // Assignment
  @Post(':id/assign/:agentId')
  assign(@Param('id', ParseUUIDPipe) id: string, @Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.service.assignToAgent(id, agentId);
  }

  @Delete(':id/assign/:agentId')
  unassign(@Param('id', ParseUUIDPipe) id: string, @Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.service.unassignFromAgent(id, agentId);
  }
}
