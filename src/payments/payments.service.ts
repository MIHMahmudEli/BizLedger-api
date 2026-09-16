import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdatePaymentDto } from './dto/update-payment.dto.js';
import { QueryPaymentDto } from './dto/query-payment.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { UserRole } from '../users/entities/user.entity.js';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  async create(projectId: string, createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const payment = this.paymentsRepository.create({
      ...createPaymentDto,
      projectId,
      amount: String(createPaymentDto.amount),
      paymentDate: new Date(createPaymentDto.paymentDate),
    });
    return this.paymentsRepository.save(payment);
  }

  async findAllByProject(projectId: string, query: QueryPaymentDto): Promise<PaginatedResponseDto<Payment>> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const qb = this.paymentsRepository.createQueryBuilder('payment');
    qb.where('payment.projectId = :projectId', { projectId });
    qb.orderBy('payment.paymentDate', 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findAll(query: QueryPaymentDto): Promise<PaginatedResponseDto<Payment>> {
    const { page = 1, limit = 20, projectId, companyId, paymentMethod, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const qb = this.paymentsRepository.createQueryBuilder('payment');

    if (projectId) {
      qb.where('payment.projectId = :projectId', { projectId });
    }

    if (companyId) {
      qb.innerJoin(Project, 'project', 'project.id = payment.projectId');
      qb.andWhere('project.companyId = :companyId', { companyId });
    }

    if (paymentMethod) {
      qb.andWhere('payment.paymentMethod = :paymentMethod', { paymentMethod });
    }

    if (dateFrom) {
      qb.andWhere('payment.paymentDate >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }

    if (dateTo) {
      qb.andWhere('payment.paymentDate <= :dateTo', { dateTo: new Date(dateTo) });
    }

    qb.orderBy('payment.paymentDate', 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto, userRole: UserRole): Promise<Payment> {
    if (userRole === UserRole.STAFF) {
      throw new ForbiddenException('Staff members cannot update payments');
    }
    const payment = await this.paymentsRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const updateData: any = { ...updatePaymentDto };
    if (updatePaymentDto.amount !== undefined) {
      updateData.amount = String(updatePaymentDto.amount);
    }
    if (updatePaymentDto.paymentDate !== undefined) {
      updateData.paymentDate = new Date(updatePaymentDto.paymentDate);
    }

    Object.assign(payment, updateData);
    return this.paymentsRepository.save(payment);
  }

  async remove(id: string, userRole: UserRole): Promise<void> {
    if (userRole === UserRole.STAFF) {
      throw new ForbiddenException('Staff members cannot delete payments');
    }
    const payment = await this.paymentsRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    await this.paymentsRepository.remove(payment);
  }
}
