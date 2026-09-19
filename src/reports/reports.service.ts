import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project, ProjectStatus } from '../projects/entities/project.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { DashboardReportDto } from './dto/dashboard-report.dto.js';
import { OutstandingQueryDto, OutstandingProjectDto } from './dto/outstanding-report.dto.js';
import { PaymentQueryDto, PaymentReportItemDto } from './dto/payment-report.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { calculatePaymentStatus } from '../projects/projects.service.js';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
    private dataSource: DataSource,
  ) {}

  async getDashboard(): Promise<DashboardReportDto> {
    const totalCompanies = await this.companiesRepository.count();

    const projects = await this.projectsRepository
      .createQueryBuilder('project')
      .select([
        'project.id',
        'project.totalValue',
        'project.status',
      ])
      .getMany();

    const totalProjects = projects.length;

    let totalProjectValue = 0;
    let unpaidCount = 0;
    let partiallyPaidCount = 0;
    let paidCount = 0;
    let overpaidCount = 0;
    let activeCount = 0;
    let completedCount = 0;

    for (const project of projects) {
      const totalValue = parseFloat(project.totalValue);
      totalProjectValue += totalValue;

      if (project.status === ProjectStatus.IN_PROGRESS || project.status === ProjectStatus.PLANNED || project.status === ProjectStatus.ON_HOLD) {
        activeCount++;
      }
      if (project.status === ProjectStatus.COMPLETED) {
        completedCount++;
      }
    }

    const paymentTotals = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('payment.projectId', 'projectId')
      .addSelect('SUM(payment.amount)', 'totalPaid')
      .groupBy('payment.projectId')
      .getRawMany();

    const paymentMap = new Map<string, number>();
    let totalPaid = 0;

    for (const pt of paymentTotals) {
      const amount = parseFloat(pt.totalPaid);
      paymentMap.set(pt.projectId, amount);
    }

    for (const project of projects) {
      const totalValue = parseFloat(project.totalValue);
      const projectPaid = paymentMap.get(project.id) || 0;
      totalPaid += projectPaid;
      const status = calculatePaymentStatus(totalValue, projectPaid);

      switch (status) {
        case 'UNPAID':
          unpaidCount++;
          break;
        case 'PARTIALLY_PAID':
          partiallyPaidCount++;
          break;
        case 'PAID':
          paidCount++;
          break;
        case 'OVERPAID':
          overpaidCount++;
          break;
      }
    }

    const totalDue = totalProjectValue - totalPaid;

    return {
      totalCompanies,
      totalProjects,
      totalProjectValue: totalProjectValue.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      totalDue: totalDue.toFixed(2),
      unpaidProjects: unpaidCount,
      partiallyPaidProjects: partiallyPaidCount,
      paidProjects: paidCount,
      overpaidProjects: overpaidCount,
      activeProjects: activeCount,
      completedProjects: completedCount,
    };
  }

  async getOutstanding(query: OutstandingQueryDto): Promise<PaginatedResponseDto<OutstandingProjectDto>> {
    const { page = 1, limit = 20, companyId, projectType, dateFrom, dateTo, minDue, maxDue } = query;
    const skip = (page - 1) * limit;

    const qb = this.projectsRepository
      .createQueryBuilder('project')
      .leftJoin(Company, 'company', 'company.id = project.companyId')
      .select([
        'project.id',
        'project.projectName',
        'project.projectType',
        'project.totalValue',
        'project.startDate',
        'project.deadline',
      ])
      .addSelect('company.companyName', 'companyName')
      .addSelect(
        `(SELECT COALESCE(SUM(pay.amount), 0) FROM payments pay WHERE pay."projectId" = project.id)`,
        'totalPaid',
      );

    if (companyId) {
      qb.andWhere('company.id = :companyId', { companyId });
    }

    if (projectType) {
      qb.andWhere('project.projectType ILIKE :projectType', { projectType: `%${projectType}%` });
    }

    if (dateFrom) {
      qb.andWhere('project.startDate >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('project.deadline <= :dateTo', { dateTo });
    }

    const rawResults = await qb.getRawMany();

    const projectsWithDue: OutstandingProjectDto[] = [];

    for (const raw of rawResults) {
      const totalValue = parseFloat(raw.project_totalValue || raw.totalValue || '0');
      const totalPaid = parseFloat(raw.totalPaid || '0');
      const due = totalValue - totalPaid;
      const paymentStatus = calculatePaymentStatus(totalValue, totalPaid);

      if (due <= 0) continue;

      if (minDue !== undefined && due < minDue) continue;
      if (maxDue !== undefined && due > maxDue) continue;

      projectsWithDue.push({
        id: raw.project_id || raw.id,
        projectName: raw.project_projectName || raw.projectName,
        projectType: raw.project_projectType || raw.projectType,
        totalValue: totalValue.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        due: due.toFixed(2),
        paymentStatus,
        companyName: raw.companyName || '',
      });
    }

    const total = projectsWithDue.length;
    const paginatedData = projectsWithDue.slice(skip, skip + limit);

    return new PaginatedResponseDto(paginatedData, total, page, limit);
  }

  async getPayments(query: PaymentQueryDto): Promise<PaginatedResponseDto<PaymentReportItemDto>> {
    const { page = 1, limit = 20, dateFrom, dateTo, companyId, projectId, paymentMethod } = query;
    const skip = (page - 1) * limit;

    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoin(Project, 'project', 'project.id = payment.projectId')
      .leftJoin(Company, 'company', 'company.id = project.companyId')
      .select([
        'payment.id',
        'payment.amount',
        'payment.paymentDate',
        'payment.paymentMethod',
        'payment.reference',
      ])
      .addSelect('project.projectName', 'projectName')
      .addSelect('company.companyName', 'companyName');

    if (dateFrom) {
      qb.andWhere('payment.paymentDate >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }

    if (dateTo) {
      qb.andWhere('payment.paymentDate <= :dateTo', { dateTo: new Date(dateTo) });
    }

    if (companyId) {
      qb.andWhere('company.id = :companyId', { companyId });
    }

    if (projectId) {
      qb.andWhere('project.id = :projectId', { projectId });
    }

    if (paymentMethod) {
      qb.andWhere('payment.paymentMethod = :paymentMethod', { paymentMethod });
    }

    qb.orderBy('payment.paymentDate', 'DESC');

    const rawResults = await qb.offset(skip).limit(limit).getRawMany();

    const totalQb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoin(Project, 'project', 'project.id = payment.projectId')
      .leftJoin(Company, 'company', 'company.id = project.companyId');

    if (dateFrom) {
      totalQb.andWhere('payment.paymentDate >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }

    if (dateTo) {
      totalQb.andWhere('payment.paymentDate <= :dateTo', { dateTo: new Date(dateTo) });
    }

    if (companyId) {
      totalQb.andWhere('company.id = :companyId', { companyId });
    }

    if (projectId) {
      totalQb.andWhere('project.id = :projectId', { projectId });
    }

    if (paymentMethod) {
      totalQb.andWhere('payment.paymentMethod = :paymentMethod', { paymentMethod });
    }

    const total = await totalQb.getCount();

    const items: PaymentReportItemDto[] = rawResults.map((raw) => ({
      id: raw.payment_id,
      amount: raw.payment_amount,
      paymentDate: raw.payment_paymentDate,
      paymentMethod: raw.payment_paymentMethod,
      reference: raw.payment_reference || '',
      projectName: raw.projectName || '',
      companyName: raw.companyName || '',
    }));

    return new PaginatedResponseDto(items, total, page, limit);
  }
}
