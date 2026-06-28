import { Module } from '@nestjs/common';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { LanDiscoveryService } from './lan-discovery.service';
import { PortScanner } from './port-scanner';

@Module({
  controllers: [DiscoveryController],
  providers: [DiscoveryService, LanDiscoveryService, PortScanner],
  exports: [DiscoveryService, LanDiscoveryService],
})
export class DiscoveryModule {}
