import { Module } from '@nestjs/common';
import { RuntimesController } from './runtimes.controller';
import { RuntimesService } from './runtimes.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [RuntimesController],
  providers: [RuntimesService],
  exports: [RuntimesService],
})
export class RuntimesModule {}
