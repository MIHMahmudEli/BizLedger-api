import { IsOptional, IsString, IsUUID, IsNumber, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class OutstandingQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectType?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Minimum due amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minDue?: number;

  @ApiPropertyOptional({ description: 'Maximum due amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDue?: number;
}

export class OutstandingProjectDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  projectType: string;

  @ApiProperty()
  totalValue: string;

  @ApiProperty()
  totalPaid: string;

  @ApiProperty()
  due: string;

  @ApiProperty()
  paymentStatus: string;

  @ApiProperty()
  companyName: string;
}
