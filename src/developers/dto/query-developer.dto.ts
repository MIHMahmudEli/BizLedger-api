import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { DeveloperStatus } from '../entities/developer.entity.js';

export class QueryDeveloperDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: DeveloperStatus })
  @IsOptional()
  @IsEnum(DeveloperStatus)
  status?: DeveloperStatus;

  @ApiPropertyOptional({ enum: ['name', 'role', 'status', 'createdAt'] })
  @IsOptional()
  @IsString()
  sortBy?: string;
}
