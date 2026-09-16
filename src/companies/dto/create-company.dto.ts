import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Tanha Corporation' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiPropertyOptional({ example: 'Agro' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '3/1 South Banashree, Dhaka' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'South Banashree' })
  @IsOptional()
  @IsString()
  addressArea?: string;

  @ApiPropertyOptional({ example: 'https://www.tanhacorporation.com' })
  @IsOptional()
  @IsString()
  website?: string;
}
