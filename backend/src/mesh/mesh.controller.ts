import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { MeshService } from './mesh.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('mesh')
@UseGuards(JwtAuthGuard)
export class MeshController {
  constructor(private meshService: MeshService) {}

  @Get('nodes')
  getNodes() {
    return { nodes: this.meshService.getNodes(), count: this.meshService.getConnectedCount() };
  }

  @Get('nodes/:id')
  getNode(@Param('id') id: string) {
    return this.meshService.getNode(id);
  }

  @Post('send')
  sendMessage(@Body() body: { to: string; type: string; payload: any }) {
    const sent = this.meshService.sendToNode(body.to, {
      from: 'api', to: body.to, type: body.type as any, payload: body.payload,
    });
    return { sent };
  }

  @Post('broadcast')
  broadcast(@Body() body: { type: string; payload: any }) {
    this.meshService.broadcast({
      from: 'api', to: 'broadcast', type: body.type as any, payload: body.payload,
    });
    return { broadcast: true };
  }
}
