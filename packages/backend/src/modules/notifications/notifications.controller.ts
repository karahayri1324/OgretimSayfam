import { Controller, Get, Put, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Bildirimler')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Bildirimlerim' })
  async getMyNotifications(@CurrentUser('id') userId: string) {
    return { success: true, data: await this.notificationsService.getByUser(userId) };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Okunmamış bildirim sayısı' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return { success: true, data: { count: await this.notificationsService.getUnreadCount(userId) } };
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Tüm bildirimleri okundu yap' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return { success: true, data: await this.notificationsService.markAllAsRead(userId) };
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Bildirimi okundu yap' })
  async markAsRead(@Param('id') id: string) {
    return { success: true, data: await this.notificationsService.markAsRead(id) };
  }
}
