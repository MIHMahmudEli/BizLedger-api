import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service.js';

@Injectable()
export class NotificationsScheduler {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Cron('0 2 * * *')
  async handleCleanup() {
    console.log('[Scheduler] Running notification cleanup...');
    await this.notificationsService.cleanupOldNotifications();
  }
}
