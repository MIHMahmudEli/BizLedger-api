import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Developer } from './entities/developer.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { CreateDeveloperDto } from './dto/create-developer.dto.js';
import { UpdateDeveloperDto } from './dto/update-developer.dto.js';
import { QueryDeveloperDto } from './dto/query-developer.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { UserRole } from '../users/entities/user.entity.js';

@Injectable()
export class DevelopersService {
  constructor(
    @InjectRepository(Developer)
    private developersRepository: Repository<Developer>,
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
  ) {}

  async create(createDeveloperDto: CreateDeveloperDto): Promise<Developer> {
    const developer = this.developersRepository.create(createDeveloperDto);
    return this.developersRepository.save(developer);
  }

  async findAll(query: QueryDeveloperDto): Promise<PaginatedResponseDto<Developer>> {
    const { page = 1, limit = 20, search, status, sortBy = 'createdAt' } = query;
    const skip = (page - 1) * limit;

    const qb = this.developersRepository.createQueryBuilder('developer');

    if (search) {
      qb.andWhere(
        '(developer.name ILIKE :search OR developer.role ILIKE :search OR developer.email ILIKE :search OR developer.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      qb.andWhere('developer.status = :status', { status });
    }

    const allowedSortFields = ['name', 'role', 'status', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy) ? `developer.${sortBy}` : 'developer.createdAt';
    qb.orderBy(sortField, 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const developerIds = data.map((d) => d.id);
    const countMap = new Map<string, number>();
    if (developerIds.length > 0) {
      const counts = await this.developersRepository.manager.query(
        `SELECT "developerId", COUNT(*)::int AS count FROM "project_developers" WHERE "developerId" = ANY($1) GROUP BY "developerId"`,
        [developerIds],
      );
      for (const row of counts) {
        countMap.set(row.developerId, row.count);
      }
    }

    const dataWithProjectCount = data.map((developer) => ({
      ...developer,
      projectCount: countMap.get(developer.id) ?? 0,
    }));

    return new PaginatedResponseDto(dataWithProjectCount, total, page, limit);
  }

  async findOne(id: string): Promise<any> {
    const developer = await this.developersRepository.findOne({
      where: { id },
      relations: { projects: true },
    });
    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    const companyIds = [...new Set(developer.projects.map((p) => p.companyId))];
    let companies: Company[] = [];
    if (companyIds.length > 0) {
      companies = await this.companiesRepository.find({ where: { id: In(companyIds) } });
    }

    const projects = developer.projects.map((project) => ({
      id: project.id,
      projectName: project.projectName,
      projectType: project.projectType,
      status: project.status,
      totalValue: project.totalValue,
      companyName: companies.find((c) => c.id === project.companyId)?.companyName ?? null,
    }));

    return { ...developer, projects };
  }

  async update(id: string, updateDeveloperDto: UpdateDeveloperDto, userRole: UserRole): Promise<Developer> {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can update developer profiles');
    }
    const developer = await this.developersRepository.findOne({ where: { id } });
    if (!developer) {
      throw new NotFoundException('Developer not found');
    }
    Object.assign(developer, updateDeveloperDto);
    return this.developersRepository.save(developer);
  }

  async remove(id: string, userRole: UserRole): Promise<void> {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can delete developer profiles');
    }
    const developer = await this.developersRepository.findOne({ where: { id } });
    if (!developer) {
      throw new NotFoundException('Developer not found');
    }
    await this.developersRepository.manager.query(
      `DELETE FROM "project_developers" WHERE "developerId" = $1`,
      [id],
    );
    await this.developersRepository.softRemove(developer);
  }
}
