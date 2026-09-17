import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service.js';
import { Notification } from './entities/notification.entity.js';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token as string);
      const userId = payload.sub;
      client.data.userId = userId;
      this.userSockets.set(userId, client.id);
      client.join(`user_${userId}`);

      const unreadCount = await this.notificationsService.getUnreadCount(userId);
      client.emit('unread-count', { count: unreadCount });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      this.userSockets.delete(userId);
    }
  }

  async sendNotification(userId: string, notification: Notification) {
    this.server.to(`user_${userId}`).emit('notification', notification);
    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    this.server.to(`user_${userId}`).emit('unread-count', { count: unreadCount });
  }

  async sendToMultipleUsers(userIds: string[], notification: Notification) {
    for (const userId of userIds) {
      await this.sendNotification(userId, notification);
    }
  }
}
