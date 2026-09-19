import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Developer } from '../developers/entities/developer.entity.js';
import { ProjectsService } from './projects.service.js';
import { ProjectsController } from './projects.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Payment, Company, User, Developer]),
    NotificationsModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
