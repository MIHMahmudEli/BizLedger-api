import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Company } from './entities/company.entity.js';
import { Contact } from '../contacts/entities/contact.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { QueryCompanyDto } from './dto/query-company.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { UserRole } from '../users/entities/user.entity.js';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
    @InjectRepository(Contact)
    private contactsRepository: Repository<Contact>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const company = this.companiesRepository.create(createCompanyDto);
    return this.companiesRepository.save(company);
  }

  async findAll(query: QueryCompanyDto): Promise<PaginatedResponseDto<Company>> {
    const { page = 1, limit = 20, search, category, area, sortBy = 'createdAt' } = query;
    const skip = (page - 1) * limit;

    const qb = this.companiesRepository.createQueryBuilder('company');

    if (search) {
      qb.andWhere(
        '(company.companyName ILIKE :search OR company.category ILIKE :search OR company.address ILIKE :search OR company.addressArea ILIKE :search OR company.website ILIKE :search OR company.contactName ILIKE :search OR company.designation ILIKE :search OR company.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (category) {
      qb.andWhere('company.category = :category', { category });
    }

    if (area) {
      qb.andWhere('company.addressArea ILIKE :area', { area: `%${area}%` });
    }

    const allowedSortFields = ['companyName', 'category', 'addressArea', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy) ? `company.${sortBy}` : 'company.createdAt';
    qb.orderBy(sortField, 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    // Attach owner-priority primary contact for the list view:
    // contact with designation "Owner" first, otherwise the first contact.
    const companyIds = data.map((c) => c.id);
    let contacts: Contact[] = [];
    if (companyIds.length > 0) {
      contacts = await this.contactsRepository.find({
        where: { companyId: In(companyIds) },
        order: { createdAt: 'ASC' },
      });
    }
    const dataWithPrimaryContact = data.map((company) => {
      const companyContacts = contacts.filter((ct) => ct.companyId === company.id);
      const primaryContact =
        companyContacts.find((ct) => ct.designation?.toLowerCase() === 'owner') ??
        companyContacts[0] ??
        null;
      return { ...company, primaryContact };
    });

    return new PaginatedResponseDto(dataWithPrimaryContact, total, page, limit);
  }

  async findOne(id: string): Promise<any> {
    const company = await this.companiesRepository.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const contacts = await this.contactsRepository.find({ where: { companyId: id } });
    const projects = await this.projectsRepository.find({ where: { companyId: id }, relations: { developers: true } });

    return { ...company, contacts, projects };
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto, userRole: UserRole): Promise<Company> {
    if (userRole === UserRole.STAFF) {
      throw new ForbiddenException('Staff members cannot update companies');
    }
    const company = await this.findOne(id);
    Object.assign(company, updateCompanyDto);
    return this.companiesRepository.save(company);
  }

  async remove(id: string, userRole: UserRole): Promise<void> {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can delete companies');
    }
    const company = await this.companiesRepository.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    await this.companiesRepository.softRemove(company);
  }
}
