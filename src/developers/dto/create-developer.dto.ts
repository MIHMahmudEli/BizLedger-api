import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeveloperStatus } from '../entities/developer.entity.js';

export class CreateDeveloperDto {
  @ApiProperty({ example: 'Rafiul Islam' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Frontend Developer' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: 'rafiul@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+8801XXXXXXXXX' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: DeveloperStatus, default: DeveloperStatus.ACTIVE })
  @IsOptional()
  @IsEnum(DeveloperStatus)
  status?: DeveloperStatus;

  @ApiPropertyOptional({ example: 'Strong in React and Node.js' })
  @IsOptional()
  @IsString()
  notes?: string;
}
