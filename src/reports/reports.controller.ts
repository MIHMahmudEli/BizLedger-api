import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';
import { DashboardReportDto } from './dto/dashboard-report.dto.js';
import { OutstandingQueryDto } from './dto/outstanding-report.dto.js';
import { PaymentQueryDto } from './dto/payment-report.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get dashboard report with totals and counts' })
  @ApiResponse({ status: 200, description: 'Dashboard report' })
  async getDashboard(): Promise<{ data: DashboardReportDto }> {
    const data = await this.reportsService.getDashboard();
    return { data };
  }

  @Get('outstanding')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get outstanding projects report' })
  @ApiResponse({ status: 200, description: 'Outstanding projects' })
  async getOutstanding(@Query() query: OutstandingQueryDto) {
    return this.reportsService.getOutstanding(query);
  }

  @Get('payments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get payment report with filters' })
  @ApiResponse({ status: 200, description: 'Payment report' })
  async getPayments(@Query() query: PaymentQueryDto) {
    return this.reportsService.getPayments(query);
  }
}
