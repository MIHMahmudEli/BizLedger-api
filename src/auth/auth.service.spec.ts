import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { vi } from 'vitest';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;

  beforeEach(async () => {
    usersService = {
      findByEmail: vi.fn(),
      findByEmailWithPassword: vi.fn(),
      create: vi.fn(),
      findOne: vi.fn(),
    };

    jwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      (usersService.findByEmail as Mock).mockResolvedValue(null);
      (usersService.create as Mock).mockResolvedValue({
        id: 'uuid-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'STAFF',
      });

      const result = await authService.register({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'StrongPassword123',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('admin@example.com');
      expect(usersService.create).toHaveBeenCalled();
    });

    it('should throw ConflictException for existing email', async () => {
      (usersService.findByEmail as Mock).mockResolvedValue({ id: 'existing-id' });

      await expect(
        authService.register({
          name: 'Admin User',
          email: 'admin@example.com',
          password: 'StrongPassword123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('StrongPassword123', 10);

      (usersService.findByEmailWithPassword as Mock).mockResolvedValue({
        id: 'uuid-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'STAFF',
        isActive: true,
        passwordHash: hashedPassword,
      });

      const result = await authService.login({
        email: 'admin@example.com',
        password: 'StrongPassword123',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('admin@example.com');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      (usersService.findByEmailWithPassword as Mock).mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'wrong@example.com',
          password: 'StrongPassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      (usersService.findByEmailWithPassword as Mock).mockResolvedValue({
        id: 'uuid-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'STAFF',
        isActive: true,
        passwordHash: '$2b$10$hashedpassword',
      });

      await expect(
        authService.login({
          email: 'admin@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      (usersService.findOne as Mock).mockResolvedValue({
        id: 'uuid-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'STAFF',
      });

      const result = await authService.getProfile('uuid-1');
      expect(result.email).toBe('admin@example.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      (usersService.findOne as Mock).mockResolvedValue(null);

      await expect(authService.getProfile('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });
});
