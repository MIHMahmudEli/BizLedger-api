import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity.js';
import { vi } from 'vitest';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockRepository = {
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    createQueryBuilder: vi.fn(),
    remove: vi.fn(),
  };

  const mockProjectRepository = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: mockRepository },
        { provide: getRepositoryToken(Project), useValue: mockProjectRepository },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a payment', async () => {
      const dto = {
        amount: 5000,
        paymentDate: '2026-09-10',
        paymentMethod: 'CASH' as const,
      };
      mockRepository.create.mockReturnValue({
        ...dto,
        projectId: 'project-1',
        amount: '5000',
        paymentDate: new Date('2026-09-10'),
      });
      mockRepository.save.mockResolvedValue({
        id: 'payment-1',
        ...dto,
        projectId: 'project-1',
        amount: '5000',
      });

      const result = await service.create('project-1', dto);
      expect(result.id).toBe('payment-1');
    });
  });

  describe('remove', () => {
    it('should remove a payment for ADMIN', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 'payment-1' });
      mockRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove('payment-1', UserRole.ADMIN)).resolves.not.toThrow();
    });

    it('should throw ForbiddenException for STAFF', async () => {
      await expect(service.remove('payment-1', UserRole.STAFF)).rejects.toThrow(ForbiddenException);
    });
  });
});
