import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Project, ProjectStatus } from './entities/project.entity.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { QueryProjectDto } from './dto/query-project.dto.js';
import { ProjectFinancialDto } from './dto/project-finance.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { UserRole } from '../users/entities/user.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { User } from '../users/entities/user.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';
import { NotificationType } from '../notifications/entities/notification.entity.js';

export type ProjectStatusType = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERPAID';

export function calculatePaymentStatus(totalValue: number, totalPaid: number): ProjectStatusType {
  if (totalPaid === 0) return 'UNPAID';
  if (totalPaid > 0 && totalPaid < totalValue) return 'PARTIALLY_PAID';
  if (totalPaid === totalValue) return 'PAID';
  return 'OVERPAID';
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async create(companyId: string, createProjectDto: CreateProjectDto): Promise<Project> {
    const project = this.projectsRepository.create({
      ...createProjectDto,
      companyId,
      totalValue: String(createProjectDto.totalValue),
    });
    const savedProject = await this.projectsRepository.save(project);

    const company = await this.companiesRepository.findOne({ where: { id: companyId } });
    const adminUsers = await this.usersRepository.find({
      where: { role: UserRole.ADMIN },
    });

    if (adminUsers.length > 0) {
      const notification = await this.notificationsService.create({
        userId: adminUsers[0].id,
        type: NotificationType.PROJECT_CREATED,
        title: 'New Project Created',
        message: `Project "${createProjectDto.projectName}" created${company ? ` for ${company.companyName}` : ''}`,
        link: `/projects/${savedProject.id}`,
      });

      for (const user of adminUsers) {
        await this.notificationsGateway.sendNotification(user.id, notification);
      }
    }

    return savedProject;
  }

  async findAll(query: QueryProjectDto): Promise<PaginatedResponseDto<Project>> {
    const { page = 1, limit = 20, search, status, projectType, companyId, area, sortBy = 'createdAt' } = query;
    const skip = (page - 1) * limit;

    let companyIds: string[] | undefined;
    if (companyId) companyIds = [companyId];
    if (area) {
      const matched = await this.companiesRepository
        .createQueryBuilder('company')
        .select('company.id', 'id')
        .where('company.addressArea ILIKE :area', { area: `%${area}%` })
        .getRawMany<{ id: string }>();
      const areaIds = matched.map((m) => m.id);
      companyIds = companyIds ? companyIds.filter((id) => areaIds.includes(id)) : areaIds;
      if (companyIds.length === 0) {
        return new PaginatedResponseDto([], 0, page, limit);
      }
    }

    const qb = this.buildQuery(search, status, projectType, companyIds);

    const allowedSortFields = ['projectName', 'projectType', 'totalValue', 'status', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy) ? `project.${sortBy}` : 'project.createdAt';
    qb.orderBy(sortField, 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findAllByCompany(companyId: string, query: QueryProjectDto): Promise<PaginatedResponseDto<Project>> {
    const { page = 1, limit = 20, search, status, projectType } = query;
    const skip = (page - 1) * limit;

    const qb = this.buildQuery(search, status, projectType, [companyId]);

    qb.orderBy('project.createdAt', 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  private buildQuery(search?: string, status?: ProjectStatus, projectType?: string, companyIds?: string[]): SelectQueryBuilder<Project> {
    const qb = this.projectsRepository.createQueryBuilder('project');

    if (companyIds && companyIds.length > 0) {
      qb.where('project.companyId IN (:...companyIds)', { companyIds });
    }

    if (status) {
      qb.andWhere('project.status = :status', { status });
    }

    if (projectType) {
      qb.andWhere('project.projectType ILIKE :projectType', { projectType: `%${projectType}%` });
    }

    if (search) {
      qb.andWhere(
        '(project.projectName ILIKE :search OR project.projectType ILIKE :search OR project.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    return qb;
  }

  async findOne(id: string): Promise<{ project: Project; financial: ProjectFinancialDto }> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const financial = await this.calculateFinancial(id);
    return { project, financial };
  }

  async findOneWithFinancial(id: string): Promise<Project & { financial: ProjectFinancialDto }> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const financial = await this.calculateFinancial(id);
    return Object.assign(project, { financial });
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userRole: UserRole): Promise<Project> {
    if (userRole === UserRole.STAFF) {
      throw new ForbiddenException('Staff members cannot update projects');
    }
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const oldStatus = project.status;
    const updateData: any = { ...updateProjectDto };
    if (updateProjectDto.totalValue !== undefined) {
      updateData.totalValue = String(updateProjectDto.totalValue);
    }

    Object.assign(project, updateData);
    const savedProject = await this.projectsRepository.save(project);

    if (updateProjectDto.status && updateProjectDto.status !== oldStatus) {
      const company = await this.companiesRepository.findOne({ where: { id: savedProject.companyId } });
      const adminManagerUsers = await this.usersRepository.find({
        where: [{ role: UserRole.ADMIN }, { role: UserRole.MANAGER }],
      });

      const statusLabels: Record<string, string> = {
        PLANNED: 'Planned',
        IN_PROGRESS: 'In Progress',
        ON_HOLD: 'On Hold',
        COMPLETED: 'Completed',
        CANCELLED: 'Cancelled',
      };

      if (adminManagerUsers.length > 0) {
        const notification = await this.notificationsService.create({
          userId: adminManagerUsers[0].id,
          type: NotificationType.PROJECT_STATUS_CHANGED,
          title: 'Project Status Changed',
          message: `Project "${savedProject.projectName}" status changed to "${statusLabels[updateProjectDto.status] || updateProjectDto.status}"${company ? ` (${company.companyName})` : ''}`,
          link: `/projects/${savedProject.id}`,
        });

        for (const user of adminManagerUsers) {
          await this.notificationsGateway.sendNotification(user.id, notification);
        }
      }
    }

    return savedProject;
  }

  async remove(id: string, userRole: UserRole): Promise<void> {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can delete projects');
    }
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    await this.projectsRepository.softRemove(project);
  }

  async calculateFinancial(projectId: string): Promise<ProjectFinancialDto> {
    const result = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'totalPaid')
      .addSelect('COUNT(payment.id)', 'paymentCount')
      .where('payment.projectId = :projectId', { projectId })
      .getRawOne();

    const project = await this.projectsRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const totalPaid = parseFloat(result?.totalPaid || '0');
    const totalValue = parseFloat(project.totalValue);
    const due = totalValue - totalPaid;
    const paymentCount = parseInt(result?.paymentCount || '0', 10);
    const paymentStatus = calculatePaymentStatus(totalValue, totalPaid);

    return {
      totalPaid: totalPaid.toFixed(2),
      due: due.toFixed(2),
      paymentCount,
      paymentStatus,
    };
  }

  async findWithFinancials(query: QueryProjectDto): Promise<PaginatedResponseDto<any>> {
    const result = await this.findAll(query);

    const companyIds = [...new Set(result.data.map((p) => p.companyId))];
    let companies: Company[] = [];
    if (companyIds.length > 0) {
      companies = await this.companiesRepository.find({ where: { id: In(companyIds) } });
    }

    const projectsWithFinancials = await Promise.all(
      result.data.map(async (project) => {
        const financial = await this.calculateFinancial(project.id);
        const company = companies.find((c) => c.id === project.companyId);
        return {
          ...project,
          financial,
          company: company
            ? { id: company.id, companyName: company.companyName, addressArea: company.addressArea }
            : null,
        };
      }),
    );

    return new PaginatedResponseDto(
      projectsWithFinancials,
      result.meta.total,
      result.meta.page,
      result.meta.limit,
    );
  }
}
