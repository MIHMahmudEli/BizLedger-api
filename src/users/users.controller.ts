import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/decorators/current-user.decorator.js';
import { UpdateCredentialsDto } from './dto/update-credentials.dto.js';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createUserDto: CreateUserDto) {
    const existingUser = await this.usersService.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.usersService.create({
      name: createUserDto.name,
      email: createUserDto.email,
      passwordHash,
    });

    // Update role if not default
    if (createUserDto.role !== user.role) {
      await this.usersService.update(user.id, { role: createUserDto.role });
    }

    const { passwordHash: _, ...result } = user as any;
    return { data: result };
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll() {
    const users = await this.usersService.findAll();
    const sanitized = users.map(({ passwordHash, ...user }) => user);
    return { data: sanitized };
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user role (admin only)' })
  @ApiResponse({ status: 200, description: 'User role updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('role') role: UserRole,
  ) {
    const user = await this.usersService.update(id, { role });
    const { passwordHash, ...result } = user as any;
    return { data: result };
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle user active status (admin only)' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async toggleStatus(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updated = await this.usersService.update(id, { isActive: !user.isActive });
    const { passwordHash, ...result } = updated as any;
    return { data: result };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user (admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }

  @Patch('me/credentials')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update own credentials' })
  @ApiResponse({ status: 200, description: 'Credentials updated successfully' })
  async updateCredentials(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateCredentialsDto,
  ) {
    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.email) {
      const existingUser = await this.usersService.findByEmail(dto.email);
      if (existingUser && existingUser.id !== user.userId) {
        throw new ConflictException('Email already in use');
      }
      updateData.email = dto.email;
    }
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    
    if (Object.keys(updateData).length > 0) {
      await this.usersService.update(user.userId, updateData);
    }
    
    return { message: 'Credentials updated successfully' };
  }
}
