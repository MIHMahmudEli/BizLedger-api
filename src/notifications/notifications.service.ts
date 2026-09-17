import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Notification } from './entities/notification.entity.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { QueryNotificationDto } from './dto/query-notification.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationsRepository.create(createNotificationDto);
    return this.notificationsRepository.save(notification);
  }

  async findAll(userId: string, query: QueryNotificationDto): Promise<PaginatedResponseDto<Notification>> {
    const { page = 1, limit = 20, search, type, isRead } = query;
    const skip = (page - 1) * limit;

    const qb = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (search) {
      qb.andWhere(
        '(notification.title ILIKE :search OR notification.message ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (type) {
      qb.andWhere('notification.type = :type', { type });
    }

    if (isRead !== undefined) {
      qb.andWhere('notification.isRead = :isRead', { isRead });
    }

    qb.orderBy('notification.createdAt', 'DESC');

    const [data, total] = await qb.skip(skip).limit(limit).getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    notification.isRead = true;
    return this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  async bulkMarkAsRead(userId: string, ids: string[]): Promise<void> {
    await this.notificationsRepository.update(
      { id: { type: 'in', value: ids } as any, userId },
      { isRead: true },
    );
  }

  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    await this.notificationsRepository.remove(notification);
  }

  async bulkRemove(userId: string, ids: string[]): Promise<void> {
    await this.notificationsRepository.delete({
      id: { type: 'in', value: ids } as any,
      userId,
    });
  }

  async cleanupOldNotifications(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.notificationsRepository.delete({
      createdAt: LessThan(thirtyDaysAgo),
    });
    console.log(`[Notifications] Cleaned up ${result.affected ?? 0} old notifications`);
  }
}
