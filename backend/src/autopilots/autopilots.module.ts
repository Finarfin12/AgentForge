import { Module } from '@nestjs/common';
import { AutopilotsController } from './autopilots.controller';
import { AutopilotsService } from './autopilots.service';
import { DatabaseModule } from '../database/database.module';
import { AgentsModule } from '../agents/agents.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [DatabaseModule, AgentsModule, TasksModule],
  controllers: [AutopilotsController],
  providers: [AutopilotsService],
  exports: [AutopilotsService],
})
export class AutopilotsModule {}
