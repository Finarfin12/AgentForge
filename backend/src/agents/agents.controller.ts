import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Res, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { InvokeAgentDto } from './dto/invoke-agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DiscoveryService } from '../discovery/discovery.service';
import { AuditService } from '../logs/audit.service';
import { RuntimesService } from '../runtimes/runtimes.service';

@Controller('agents')
export class AgentsController {
  constructor(
    private agentsService: AgentsService,
    private discoveryService: DiscoveryService,
    private auditService: AuditService,
    private runtimesService?: RuntimesService,
  ) {}

  @Post('register')
  publicRegister(@Body() dto: CreateAgentDto) { return this.agentsService.create(dto); }

  @Post(':id/heartbeat')
  publicHeartbeat(@Param('id', ParseUUIDPipe) id: string) { return this.agentsService.heartbeat(id); }

  @UseGuards(JwtAuthGuard)
  @Post('discover')
  async discover() {
    const discovered = await this.discoveryService.discoverLocal();
    const registered: any[] = [];
    for (const agent of discovered) {
      try {
        const slug = `local_${agent.type}_${agent.port}`;
        const existing = await this.agentsService.findAll({ search: slug });
        if (existing.length === 0) {
          const created = await this.agentsService.create({
            name: slug,
            displayName: `Local ${agent.name}`,
            description: `Auto-discovered ${agent.type} on port ${agent.port}`,
            capabilities: ['agentic-coding'],
            config: { provider: agent.type, model: agent.models?.[0] || 'default', temperature: 0.7, maxTokens: 4096, apiEndpoint: `http://${agent.host}:${agent.port}` },
          });
          registered.push(created);
        } else {
          registered.push(existing[0]);
        }
      } catch { /* skip */ }
    }

    // Also auto-detect CLI agents via runtimes
    if (this.runtimesService) {
      try {
        const clis = await this.runtimesService.detectLocalCLIs();
        for (const cli of clis) {
          const existing = await this.agentsService.findAll({ search: `cli_${cli.provider}` });
          if (existing.length === 0) {
            // Register runtime first
            const rt = await this.runtimesService.register({
              name: `CLI ${cli.name}`,
              provider: 'cli',
              mode: 'local',
              daemonId: `cli-${cli.provider}`,
              deviceName: cli.path,
              version: cli.version,
              metadata: { detectedPath: cli.path, cliBinary: cli.name, autoDetected: true },
            });

            // Create agent linked to the runtime
            const created = await this.agentsService.create({
              name: `cli_${cli.provider}`,
              displayName: `CLI ${cli.name}`,
              description: `Auto-detected CLI: ${cli.name} at ${cli.path}`,
              capabilities: ['agentic-coding'],
              config: { provider: 'cli', model: cli.name, cliPath: cli.path },
              runtimeId: rt.id,
            });
            registered.push(created);
          } else {
            registered.push(existing[0]);
          }
        }
      } catch { /* skip */ }
    }

    return { discovered: discovered.length + (registered.length > discovered.length ? 1 : 0), registered };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/invoke')
  invoke(@Param('id', ParseUUIDPipe) id: string, @Body() dto: InvokeAgentDto) { return this.agentsService.invoke(id, dto); }

  @UseGuards(JwtAuthGuard)
  @Post(':id/invoke/stream')
  async invokeStream(@Param('id', ParseUUIDPipe) id: string, @Body() dto: InvokeAgentDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const timeout = setTimeout(() => {
      if (!res.writableEnded) { res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream timed out after 120s' })}\n\n`); res.end(); }
    }, 120_000);

    const req = (res as any).req;
    let clientDisconnected = false;
    if (req) req.on('close', () => { clientDisconnected = true; clearTimeout(timeout); });

    try {
      const stream = this.agentsService.invokeStream(id, dto);
      for await (const event of stream) {
        if (clientDisconnected || res.writableEnded) break;
        res.write(event);
      }
    } catch (err) {
      if (!clientDisconnected && !res.writableEnded) res.write(`data: ${JSON.stringify({ type: 'error', message: (err as Error).message })}\n\n`);
    } finally {
      clearTimeout(timeout);
      if (!res.writableEnded) res.end();
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('search') search?: string, @Query('isActive') isActive?: string) {
    return this.agentsService.findAll({ search, isActive: isActive !== undefined ? isActive === 'true' : undefined });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.agentsService.findOne(id); }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateAgentDto, @Req() req: Request) {
    const result = await this.agentsService.create(dto);
    this.auditService.record({ action: `Created agent ${result.name}`, entityType: 'agent', entityId: result.id, userId: (req as any).user.userId });
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAgentDto, @Req() req: Request) {
    const result = await this.agentsService.update(id, dto);
    this.auditService.record({ action: `Updated agent ${result.name}`, entityType: 'agent', entityId: id, userId: (req as any).user.userId });
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const result = await this.agentsService.remove(id);
    this.auditService.record({ action: `Deleted agent ${id}`, entityType: 'agent', entityId: id, userId: (req as any).user.userId });
    return result;
  }
}
