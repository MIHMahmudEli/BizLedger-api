import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService, calculatePaymentStatus } from './projects.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from './entities/project.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Developer } from '../developers/entities/developer.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';
import { vi } from 'vitest';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockProjectsRepository = {
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    createQueryBuilder: vi.fn(),
    softRemove: vi.fn(),
  };

  const mockPaymentsRepository = {
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    createQueryBuilder: vi.fn(),
    remove: vi.fn(),
  };

  const mockCompaniesRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
  };

  const mockUsersRepository = {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn(),
  };

  const mockDevelopersRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
  };

  const mockNotificationsService = {
    create: vi.fn(),
  };

  const mockNotificationsGateway = {
    sendNotification: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: mockProjectsRepository },
        { provide: getRepositoryToken(Payment), useValue: mockPaymentsRepository },
        { provide: getRepositoryToken(Company), useValue: mockCompaniesRepository },
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: getRepositoryToken(Developer), useValue: mockDevelopersRepository },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: NotificationsGateway, useValue: mockNotificationsGateway },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculatePaymentStatus', () => {
    it('should return UNPAID when totalPaid is 0', () => {
      expect(calculatePaymentStatus(41500, 0)).toBe('UNPAID');
    });

    it('should return PARTIALLY_PAID when totalPaid < totalValue', () => {
      expect(calculatePaymentStatus(41500, 13000)).toBe('PARTIALLY_PAID');
    });

    it('should return PAID when totalPaid equals totalValue', () => {
      expect(calculatePaymentStatus(41500, 41500)).toBe('PAID');
    });

    it('should return OVERPAID when totalPaid > totalValue', () => {
      expect(calculatePaymentStatus(10000, 12000)).toBe('OVERPAID');
    });
  });

  describe('create', () => {
    it('should create a project', async () => {
      const dto = {
        projectName: 'Ecommerce Website',
        projectType: 'Ecommerce',
        totalValue: 41500,
      };
      mockProjectsRepository.create.mockReturnValue({ ...dto, companyId: 'company-1', totalValue: '41500' });
      mockProjectsRepository.save.mockResolvedValue({ id: 'project-1', ...dto, companyId: 'company-1', totalValue: '41500' });

      const result = await service.create('company-1', dto);
      expect(result.id).toBe('project-1');
    });

    it('should create a project and assign developers', async () => {
      const mockDev = { id: 'dev-1', name: 'Alice' };
      mockDevelopersRepository.find.mockResolvedValue([mockDev]);

      const dto = {
        projectName: 'Mobile App',
        projectType: 'Mobile App',
        totalValue: 25000,
        developerIds: ['dev-1'],
      };
      mockProjectsRepository.create.mockReturnValue({ ...dto, companyId: 'company-1', totalValue: '25000', developers: [mockDev] });
      mockProjectsRepository.save.mockResolvedValue({ id: 'project-2', ...dto, companyId: 'company-1', totalValue: '25000', developers: [mockDev] });

      const result = await service.create('company-1', dto);
      expect(result.id).toBe('project-2');
      expect(mockDevelopersRepository.find).toHaveBeenCalled();
    });

    it('should throw NotFoundException if any developer does not exist', async () => {
      mockDevelopersRepository.find.mockResolvedValue([]);

      const dto = {
        projectName: 'Mobile App',
        projectType: 'Mobile App',
        totalValue: 25000,
        developerIds: ['non-existent-id'],
      };

      await expect(service.create('company-1', dto)).rejects.toThrow();
    });
  });

  describe('calculateFinancial', () => {
    it('should calculate financial data correctly', async () => {
      mockProjectsRepository.findOne.mockResolvedValue({
        id: 'project-1',
        totalValue: '41500',
      });

      const mockQb = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({
          totalPaid: '13000',
          paymentCount: '2',
        }),
      };
      mockPaymentsRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.calculateFinancial('project-1');

      expect(result.totalPaid).toBe('13000.00');
      expect(result.due).toBe('28500.00');
      expect(result.paymentCount).toBe(2);
      expect(result.paymentStatus).toBe('PARTIALLY_PAID');
    });
  });
});
