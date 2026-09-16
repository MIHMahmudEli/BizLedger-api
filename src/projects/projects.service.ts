import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Project, ProjectStatus } from './entities/project.entity.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { QueryProjectDto } from './dto/query-project.dto.js';
import { ProjectFinancialDto } from './dto/project-finance.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { UserRole } from '../users/entities/user.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';

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
  ) {}

  async create(companyId: string, createProjectDto: CreateProjectDto): Promise<Project> {
    const project = this.projectsRepository.create({
      ...createProjectDto,
      companyId,
      totalValue: String(createProjectDto.totalValue),
    });
    return this.projectsRepository.save(project);
  }

  async findAll(query: QueryProjectDto): Promise<PaginatedResponseDto<Project>> {
    const { page = 1, limit = 20, search, status, projectType, companyId, sortBy = 'createdAt' } = query;
    const skip = (page - 1) * limit;

    const qb = this.buildQuery(search, status, projectType, companyId);

    const allowedSortFields = ['projectName', 'projectType', 'totalValue', 'status', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy) ? `project.${sortBy}` : 'project.createdAt';
    qb.orderBy(sortField, 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findAllByCompany(companyId: string, query: QueryProjectDto): Promise<PaginatedResponseDto<Project>> {
    const { page = 1, limit = 20, search, status, projectType } = query;
    const skip = (page - 1) * limit;

    const qb = this.buildQuery(search, status, projectType, companyId);

    qb.orderBy('project.createdAt', 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  private buildQuery(search?: string, status?: ProjectStatus, projectType?: string, companyId?: string): SelectQueryBuilder<Project> {
    const qb = this.projectsRepository.createQueryBuilder('project');

    if (companyId) {
      qb.where('project.companyId = :companyId', { companyId });
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

    const updateData: any = { ...updateProjectDto };
    if (updateProjectDto.totalValue !== undefined) {
      updateData.totalValue = String(updateProjectDto.totalValue);
    }

    Object.assign(project, updateData);
    return this.projectsRepository.save(project);
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

    const projectsWithFinancials = await Promise.all(
      result.data.map(async (project) => {
        const financial = await this.calculateFinancial(project.id);
        return { ...project, financial };
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
