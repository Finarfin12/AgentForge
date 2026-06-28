import { Module } from '@nestjs/common';
import { MeshGateway } from './mesh.gateway';
import { MeshService } from './mesh.service';
import { MeshController } from './mesh.controller';

@Module({
  controllers: [MeshController],
  providers: [MeshService, MeshGateway],
  exports: [MeshService],
})
export class MeshModule {}
