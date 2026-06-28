import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { LanDiscoveryService } from './lan-discovery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('discovery')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiscoveryController {
  constructor(
    private discoveryService: DiscoveryService,
    private lanDiscovery: LanDiscoveryService,
  ) {}

  @Get()
  getDiscovered() {
    return { agents: this.discoveryService.getDiscovered() };
  }

  @Get('lan')
  getLanPeers() {
    return { peers: this.lanDiscovery.getPeers() };
  }

  @Post('scan')
  scanLocal() {
    return this.discoveryService.discoverLocal();
  }

  @Post('scan/host')
  @Roles('admin')
  scanHost(@Body() body: { host: string; ports?: number[] }) {
    return this.discoveryService.discoverHost(body.host, body.ports);
  }
}
