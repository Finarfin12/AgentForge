import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseUUIDPipe, Req } from '@nestjs/common';
import { SquadsService } from './squads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('squads')
@UseGuards(JwtAuthGuard)
export class SquadsController {
  constructor(private service: SquadsService) {}

  @Get()
  findAll(@Req() req: any) {
    const scope = req.query.scope as string || 'active';
    return scope === 'archived' ? this.service.findAllArchived() : this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() body: {
    name: string; description?: string; instructions?: string;
    leaderId: string; avatarUrl?: string; createdBy?: string;
  }, @Req() req: any) {
    return this.service.create({ ...body, createdBy: req.user?.userId });
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: {
    name?: string; description?: string; instructions?: string;
    leaderId?: string; avatarUrl?: string;
  }) { return this.service.update(id, body); }

  @Post(':id/archive')
  archive(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.archive(id, req.user?.userId);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseUUIDPipe) id: string) { return this.service.restore(id); }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) { return this.service.remove(id); }

  @Post(':id/members')
  addMember(@Param('id', ParseUUIDPipe) id: string, @Body() body: { agentId: string; role?: string }) {
    return this.service.addMember(id, body.agentId, body.role);
  }

  @Delete(':id/members/:agentId')
  removeMember(@Param('id', ParseUUIDPipe) id: string, @Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.service.removeMember(id, agentId);
  }

  @Get(':id/members/status')
  memberStatus(@Param('id', ParseUUIDPipe) id: string) { return this.service.getMemberStatus(id); }
}
