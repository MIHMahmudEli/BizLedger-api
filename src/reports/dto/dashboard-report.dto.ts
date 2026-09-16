import { ApiProperty } from '@nestjs/swagger';

export class DashboardReportDto {
  @ApiProperty({ example: 25 })
  totalCompanies: number;

  @ApiProperty({ example: 50 })
  totalProjects: number;

  @ApiProperty({ example: '1250000.00' })
  totalProjectValue: string;

  @ApiProperty({ example: '800000.00' })
  totalPaid: string;

  @ApiProperty({ example: '450000.00' })
  totalDue: string;

  @ApiProperty({ example: 8 })
  unpaidProjects: number;

  @ApiProperty({ example: 20 })
  partiallyPaidProjects: number;

  @ApiProperty({ example: 17 })
  paidProjects: number;

  @ApiProperty({ example: 5 })
  overpaidProjects: number;

  @ApiProperty({ example: 25 })
  activeProjects: number;

  @ApiProperty({ example: 15 })
  completedProjects: number;
}
