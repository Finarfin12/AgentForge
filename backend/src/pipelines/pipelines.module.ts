import { Module } from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import { PipelinesController } from './pipelines.controller';

import { DatabaseModule } from '../database/database.module';
import { TasksModule } from '../tasks/tasks.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [DatabaseModule, TasksModule, LogsModule],
  controllers: [PipelinesController],
  providers: [PipelinesService],
})
export class PipelinesModule {}
