import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from './companies.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Company } from './entities/company.entity.js';
import { Contact } from '../contacts/entities/contact.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity.js';
import { vi } from 'vitest';

describe('CompaniesService', () => {
  let service: CompaniesService;

  const mockRepository = {
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    createQueryBuilder: vi.fn(),
    softRemove: vi.fn(),
  };

  const mockContactRepository = {
    find: vi.fn(),
  };

  const mockProjectRepository = {
    find: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: getRepositoryToken(Company), useValue: mockRepository },
        { provide: getRepositoryToken(Contact), useValue: mockContactRepository },
        { provide: getRepositoryToken(Project), useValue: mockProjectRepository },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new company', async () => {
      const dto = { companyName: 'Tanha Corporation', category: 'Agro' };
      mockRepository.create.mockReturnValue(dto);
      mockRepository.save.mockResolvedValue({ id: 'uuid-1', ...dto });

      const result = await service.create(dto);
      expect(result.id).toBe('uuid-1');
      expect(result.companyName).toBe('Tanha Corporation');
    });
  });

  describe('findOne', () => {
    it('should return a company by id', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 'uuid-1',
        companyName: 'Tanha Corporation',
      });

      const result = await service.findOne('uuid-1');
      expect(result.companyName).toBe('Tanha Corporation');
    });

    it('should throw NotFoundException if company not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a company for ADMIN', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 'uuid-1',
        companyName: 'Old Name',
      });
      mockRepository.save.mockResolvedValue({
        id: 'uuid-1',
        companyName: 'New Name',
      });

      const result = await service.update('uuid-1', { companyName: 'New Name' }, UserRole.ADMIN);
      expect(result.companyName).toBe('New Name');
    });

    it('should throw ForbiddenException for STAFF', async () => {
      await expect(
        service.update('uuid-1', { companyName: 'New Name' }, UserRole.STAFF),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should soft delete a company for ADMIN', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 'uuid-1' });
      mockRepository.softRemove.mockResolvedValue(undefined);

      await expect(service.remove('uuid-1', UserRole.ADMIN)).resolves.not.toThrow();
    });

    it('should throw ForbiddenException for non-ADMIN', async () => {
      await expect(service.remove('uuid-1', UserRole.MANAGER)).rejects.toThrow(ForbiddenException);
    });
  });
});
