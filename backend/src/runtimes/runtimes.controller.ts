import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseUUIDPipe, Req } from '@nestjs/common';
import { RuntimesService } from './runtimes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('runtimes')
export class RuntimesController {
  constructor(private service: RuntimesService) {}

  @Get('detect')
  detectCLIs() { return this.service.detectLocalCLIs(); }

  @Get('stats')
  stats() { return this.service.getStats(); }

  @Post('register')
  register(@Body() body: {
    name: string; provider: string; mode?: 'local' | 'cloud';
    daemonId?: string; deviceName?: string; version?: string; metadata?: Record<string, unknown>;
  }) { return this.service.register(body); }

  @Post(':id/heartbeat')
  heartbeat(@Param('id', ParseUUIDPipe) id: string) { return this.service.heartbeat(id); }

  @Post(':id/offline')
  offline(@Param('id', ParseUUIDPipe) id: string) { return this.service.markOffline(id); }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() { return this.service.findAll(); }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.service.findOne(id); }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) { return this.service.remove(id); }
}
