import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DevelopersService } from './developers.service.js';
import { CreateDeveloperDto } from './dto/create-developer.dto.js';
import { UpdateDeveloperDto } from './dto/update-developer.dto.js';
import { QueryDeveloperDto } from './dto/query-developer.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Developers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('developers')
export class DevelopersController {
  constructor(private readonly developersService: DevelopersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new developer profile (admin only)' })
  @ApiResponse({ status: 201, description: 'Developer created successfully' })
  async create(@Body() createDeveloperDto: CreateDeveloperDto) {
    const developer = await this.developersService.create(createDeveloperDto);
    return { data: developer };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get paginated list of developers' })
  @ApiResponse({ status: 200, description: 'List of developers' })
  async findAll(@Query() query: QueryDeveloperDto) {
    return this.developersService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get developer details with assigned projects' })
  @ApiResponse({ status: 200, description: 'Developer details' })
  @ApiResponse({ status: 404, description: 'Developer not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const developer = await this.developersService.findOne(id);
    return { data: developer };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a developer profile (admin only)' })
  @ApiResponse({ status: 200, description: 'Developer updated successfully' })
  @ApiResponse({ status: 404, description: 'Developer not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDeveloperDto: UpdateDeveloperDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const developer = await this.developersService.update(id, updateDeveloperDto, user.role as UserRole);
    return { data: developer };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a developer profile (admin only)' })
  @ApiResponse({ status: 200, description: 'Developer deleted successfully' })
  @ApiResponse({ status: 404, description: 'Developer not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.developersService.remove(id, user.role as UserRole);
    return { message: 'Developer deleted successfully' };
  }
}
