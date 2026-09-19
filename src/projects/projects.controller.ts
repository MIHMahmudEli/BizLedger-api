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
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { QueryProjectDto } from './dto/query-project.dto.js';
import { AssignDevelopersDto } from './dto/assign-developers.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post('companies/:companyId/projects')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new project for a company' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    const project = await this.projectsService.create(companyId, createProjectDto);
    return { data: project };
  }

  @Get('companies/:companyId/projects')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get projects for a company' })
  @ApiResponse({ status: 200, description: 'List of projects' })
  async findAllByCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: QueryProjectDto,
  ) {
    return this.projectsService.findAllByCompany(companyId, query);
  }

  @Get('projects')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get all projects with filters' })
  @ApiResponse({ status: 200, description: 'List of projects' })
  async findAll(@Query() query: QueryProjectDto) {
    return this.projectsService.findWithFinancials(query);
  }

  @Get('projects/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get project details with financial data' })
  @ApiResponse({ status: 200, description: 'Project details' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const { project, financial } = await this.projectsService.findOne(id);
    return { data: { ...project, financial } };
  }

  @Patch('projects/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const project = await this.projectsService.update(id, updateProjectDto, user.role as UserRole);
    return { data: project };
  }

  @Patch('projects/:id/developers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Assign the full set of developers to a project' })
  @ApiResponse({ status: 200, description: 'Developers assigned successfully' })
  @ApiResponse({ status: 404, description: 'Project or developer not found' })
  async assignDevelopers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignDevelopersDto: AssignDevelopersDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const project = await this.projectsService.assignDevelopers(id, assignDevelopersDto.developerIds, user.role as UserRole);
    return { data: project };
  }

  @Delete('projects/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.projectsService.remove(id, user.role as UserRole);
    return { message: 'Project deleted successfully' };
  }
}
