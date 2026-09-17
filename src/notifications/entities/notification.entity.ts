import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum NotificationType {
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_STATUS_CHANGED = 'PROJECT_STATUS_CHANGED',
  USER_CREATED = 'USER_CREATED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  DEADLINE_APPROACHING = 'DEADLINE_APPROACHING',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'userId', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  link: string;

  @Column({ name: 'isRead', type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz' })
  createdAt: Date;
}
