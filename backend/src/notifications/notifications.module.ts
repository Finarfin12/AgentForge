import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [LogsModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
