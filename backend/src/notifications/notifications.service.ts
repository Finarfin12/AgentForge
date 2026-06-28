import { Injectable } from '@nestjs/common';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class NotificationsService {
  constructor(private logsService: LogsService) {}

  async notify(userId: string, message: string, metadata?: Record<string, unknown>) {
    return this.logsService.create(
      {
        level: 'info',
        source: 'notification',
        message,
        details: metadata ?? {},
        userId,
      },
      userId,
    );
  }

  async notifyBroadcast(message: string, metadata?: Record<string, unknown>) {
    return this.logsService.create(
      {
        level: 'info',
        source: 'notification',
        message,
        details: metadata ?? {},
      },
      'system',
    );
  }
}
