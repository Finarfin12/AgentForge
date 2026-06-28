import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TasksController } from './tasks.controller';
import { TasksService, TASK_QUEUE } from './tasks.service';
import { TasksProcessor } from './tasks.processor';
import { DatabaseModule } from '../database/database.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    DatabaseModule,
    IntegrationsModule,
    BullModule.registerQueue({ name: TASK_QUEUE }),
    LogsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksProcessor],
  exports: [TasksService],
})
export class TasksModule {}
