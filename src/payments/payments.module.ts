import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Project, Company])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
