import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';
import { NotificationType } from '../notifications/entities/notification.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async create(data: { name: string; email: string; passwordHash: string }): Promise<User> {
    const user = this.usersRepository.create(data);
    const savedUser = await this.usersRepository.save(user);

    const adminUsers = await this.usersRepository.find({
      where: { role: UserRole.ADMIN },
    });

    if (adminUsers.length > 0) {
      const notification = await this.notificationsService.create({
        userId: adminUsers[0].id,
        type: NotificationType.USER_CREATED,
        title: 'New User Registered',
        message: `New user "${savedUser.name}" has registered with role ${savedUser.role}`,
        link: '/users',
      });

      for (const admin of adminUsers) {
        await this.notificationsGateway.sendNotification(admin.id, notification);
      }
    }

    return savedUser;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<(User & { passwordHash: string }) | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne() as Promise<(User & { passwordHash: string }) | null>;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldRole = user.role;
    Object.assign(user, data);
    const savedUser = await this.usersRepository.save(user);

    if (data.role && data.role !== oldRole) {
      const roleLabels: Record<string, string> = {
        ADMIN: 'Admin',
        MANAGER: 'Manager',
        STAFF: 'Staff',
      };

      const notification = await this.notificationsService.create({
        userId: savedUser.id,
        type: NotificationType.USER_ROLE_CHANGED,
        title: 'Your Role Has Been Changed',
        message: `Your role has been changed from "${roleLabels[oldRole] || oldRole}" to "${roleLabels[data.role] || data.role}"`,
        link: '/users',
      });

      await this.notificationsGateway.sendNotification(savedUser.id, notification);
    }

    return savedUser;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersRepository.remove(user);
  }
}
