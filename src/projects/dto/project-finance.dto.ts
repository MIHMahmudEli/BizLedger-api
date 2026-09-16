import { ApiProperty } from '@nestjs/swagger';

export class ProjectFinancialDto {
  @ApiProperty({ example: '13000.00' })
  totalPaid: string;

  @ApiProperty({ example: '28500.00' })
  due: string;

  @ApiProperty({ example: 2 })
  paymentCount: number;

  @ApiProperty({ example: 'PARTIALLY_PAID', enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERPAID'] })
  paymentStatus: string;
}

export class ProjectWithFinancialDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  projectType: string;

  @ApiProperty()
  totalValue: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ type: ProjectFinancialDto })
  financial: ProjectFinancialDto;
}
