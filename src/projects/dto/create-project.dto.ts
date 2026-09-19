import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsDateString, Min, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '../entities/project.entity.js';

export class CreateProjectDto {
  @ApiProperty({ example: 'Ecommerce Website' })
  @IsString()
  @IsNotEmpty()
  projectName: string;

  @ApiProperty({ example: 'Ecommerce' })
  @IsString()
  @IsNotEmpty()
  projectType: string;

  @ApiProperty({ example: 41500 })
  @IsNumber()
  @Min(0)
  totalValue: number;

  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.PLANNED })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ example: 'Ecommerce website development' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String], description: 'Optional list of developer IDs to assign to the project' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  developerIds?: string[];
}
