import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';
import { QueryContactDto } from './dto/query-contact.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactsRepository: Repository<Contact>,
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
  ) {}

  async create(companyId: string, createContactDto: CreateContactDto): Promise<Contact> {
    const contact = this.contactsRepository.create({
      ...createContactDto,
      companyId,
    });
    return this.contactsRepository.save(contact);
  }

  async findAllByCompany(companyId: string, query: QueryContactDto): Promise<PaginatedResponseDto<any>> {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const qb = this.contactsRepository
      .createQueryBuilder('contact')
      .leftJoin(Company, 'company', 'company.id = contact.companyId')
      .addSelect('company.companyName', 'companyName')
      .where('contact.companyId = :companyId', { companyId });

    if (search) {
      qb.andWhere(
        '(contact.name ILIKE :search OR contact.designation ILIKE :search OR contact.mobile ILIKE :search OR contact.email ILIKE :search OR company.companyName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('contact.createdAt', 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findAll(query: QueryContactDto): Promise<PaginatedResponseDto<any>> {
    const { page = 1, limit = 20, search, companyId } = query;
    const skip = (page - 1) * limit;

    const qb = this.contactsRepository
      .createQueryBuilder('contact')
      .leftJoin(Company, 'company', 'company.id = contact.companyId')
      .addSelect('company.companyName', 'companyName');

    if (companyId) {
      qb.where('contact.companyId = :companyId', { companyId });
    }

    if (search) {
      const whereClause = companyId ? 'AND' : 'WHERE';
      qb.andWhere(
        `${whereClause} (contact.name ILIKE :search OR contact.designation ILIKE :search OR contact.mobile ILIKE :search OR contact.email ILIKE :search OR company.companyName ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    qb.orderBy('contact.createdAt', 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string): Promise<Contact> {
    const contact = await this.contactsRepository.findOne({ where: { id } });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    return contact;
  }

  async update(id: string, updateContactDto: UpdateContactDto): Promise<Contact> {
    const contact = await this.findOne(id);
    Object.assign(contact, updateContactDto);
    return this.contactsRepository.save(contact);
  }

  async remove(id: string): Promise<void> {
    const contact = await this.findOne(id);
    await this.contactsRepository.remove(contact);
  }
}
