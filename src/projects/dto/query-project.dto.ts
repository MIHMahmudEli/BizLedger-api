import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { ProjectStatus } from '../entities/project.entity.js';

export class QueryProjectDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Filter by company area (addressArea)' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ enum: ['projectName', 'projectType', 'totalValue', 'status', 'createdAt'] })
  @IsOptional()
  @IsString()
  sortBy?: string;
}
