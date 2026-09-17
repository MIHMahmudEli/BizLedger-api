import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdatePaymentDto } from './dto/update-payment.dto.js';
import { QueryPaymentDto } from './dto/query-payment.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { UserRole } from '../users/entities/user.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';
import { NotificationType } from '../notifications/entities/notification.entity.js';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async create(projectId: string, createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const payment = this.paymentsRepository.create({
      ...createPaymentDto,
      projectId,
      amount: String(createPaymentDto.amount),
      paymentDate: new Date(createPaymentDto.paymentDate),
    });
    const savedPayment = await this.paymentsRepository.save(payment);

    const project = await this.projectsRepository.findOne({ where: { id: projectId } });
    if (project) {
      const company = await this.companiesRepository.findOne({ where: { id: project.companyId } });
      const adminManagerUsers = await this.usersRepository.find({
        where: [{ role: UserRole.ADMIN }, { role: UserRole.MANAGER }],
      });

      const notification = await this.notificationsService.create({
        userId: adminManagerUsers[0]?.id,
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'Payment Received',
        message: `Payment of ${createPaymentDto.amount} received for project "${project.projectName}"${company ? ` (${company.companyName})` : ''}`,
        link: `/projects/${projectId}`,
      });

      for (const user of adminManagerUsers) {
        await this.notificationsGateway.sendNotification(user.id, notification);
      }
    }

    return savedPayment;
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

  async findAll(query: QueryPaymentDto): Promise<PaginatedResponseDto<any>> {
    const { page = 1, limit = 20, projectId, companyId, paymentMethod, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoin(Project, 'project', 'project.id = payment.projectId')
      .leftJoin(Company, 'company', 'company.id = project.companyId')
      .select([
        'payment.id',
        'payment.projectId',
        'payment.amount',
        'payment.paymentDate',
        'payment.paymentMethod',
        'payment.reference',
        'payment.note',
        'payment.createdAt',
        'payment.updatedAt',
      ])
      .addSelect('project.projectName', 'projectName')
      .addSelect('company.companyName', 'companyName');

    if (projectId) {
      qb.where('payment.projectId = :projectId', { projectId });
    }

    if (companyId) {
      qb.andWhere('company.id = :companyId', { companyId });
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

    const rawResults = await qb.offset(skip).limit(limit).getRawMany();

    const totalQb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoin(Project, 'project', 'project.id = payment.projectId')
      .leftJoin(Company, 'company', 'company.id = project.companyId');

    if (projectId) {
      totalQb.where('payment.projectId = :projectId', { projectId });
    }

    if (companyId) {
      totalQb.andWhere('company.id = :companyId', { companyId });
    }

    if (paymentMethod) {
      totalQb.andWhere('payment.paymentMethod = :paymentMethod', { paymentMethod });
    }

    if (dateFrom) {
      totalQb.andWhere('payment.paymentDate >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }

    if (dateTo) {
      totalQb.andWhere('payment.paymentDate <= :dateTo', { dateTo: new Date(dateTo) });
    }

    const total = await totalQb.getCount();

    const data = rawResults.map((raw) => ({
      id: raw.payment_id,
      projectId: raw.payment_projectId,
      amount: raw.payment_amount,
      paymentDate: raw.payment_paymentDate,
      paymentMethod: raw.payment_paymentMethod,
      reference: raw.payment_reference,
      note: raw.payment_note,
      createdAt: raw.payment_createdAt,
      updatedAt: raw.payment_updatedAt,
      projectName: raw.projectName || '',
      companyName: raw.companyName || '',
    }));

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
