import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service.js';
import { QueryNotificationDto } from './dto/query-notification.dto.js';
import { BulkActionDto } from './dto/bulk-action.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationsService.findAll(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@CurrentUser('userId') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser('userId') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  @Patch('bulk-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk mark notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  async bulkMarkAsRead(
    @CurrentUser('userId') userId: string,
    @Body() bulkActionDto: BulkActionDto,
  ) {
    await this.notificationsService.bulkMarkAsRead(userId, bulkActionDto.ids);
    return { success: true };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.notificationsService.remove(id, userId);
    return { success: true };
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete notifications' })
  @ApiResponse({ status: 200, description: 'Notifications deleted' })
  async bulkRemove(
    @CurrentUser('userId') userId: string,
    @Body() bulkActionDto: BulkActionDto,
  ) {
    await this.notificationsService.bulkRemove(userId, bulkActionDto.ids);
    return { success: true };
  }
}
