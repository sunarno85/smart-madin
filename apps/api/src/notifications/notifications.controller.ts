import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@RequirePermissions('notifications.read')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  // ---- Templates ----

  @Get('templates')
  @ApiOperation({ summary: 'Get all notification templates' })
  async findTemplates() {
    return this.notificationsService.findAllTemplates();
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template detail' })
  async findOneTemplate(@Param('id') id: string) {
    return this.notificationsService.findOneTemplate(id);
  }

  @Post('templates')
  @RequirePermissions('notifications.create')
  @ApiOperation({ summary: 'Create notification template' })
  async createTemplate(@Body() body: {
    name: string; type: string; subject: string; message: string;
  }) {
    return this.notificationsService.createTemplate(body as any);
  }

  @Patch('templates/:id')
  @RequirePermissions('notifications.update')
  @ApiOperation({ summary: 'Update notification template' })
  async updateTemplate(@Param('id') id: string, @Body() body: any) {
    return this.notificationsService.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  @RequirePermissions('notifications.delete')
  @ApiOperation({ summary: 'Delete notification template' })
  async deleteTemplate(@Param('id') id: string) {
    return this.notificationsService.deleteTemplate(id);
  }

  // ---- Send ----

  @Post('send')
  @RequirePermissions('notifications.create')
  @ApiOperation({ summary: 'Send single notification' })
  async sendNotification(@Body() body: {
    templateId?: string;
    type: string;
    channel: string;
    recipientName: string;
    recipientPhone: string;
    subject: string;
    message: string;
    metadata?: any;
  }) {
    return this.notificationsService.sendNotification(body as any);
  }

  @Post('send/bulk')
  @RequirePermissions('notifications.create')
  @ApiOperation({ summary: 'Send bulk notifications' })
  async bulkSend(@Body() body: {
    templateId?: string;
    type: string;
    channel: string;
    recipients: { name: string; phone: string }[];
    subject: string;
    message: string;
  }) {
    return this.notificationsService.bulkSend(body as any);
  }

  @Post('send/attendance-alert/:sessionId')
  @RequirePermissions('notifications.create')
  @ApiOperation({ summary: 'Send attendance alerts to absent students parents' })
  async sendAttendanceAlert(@Param('sessionId') sessionId: string) {
    return this.notificationsService.sendAttendanceAlert(sessionId);
  }

  @Post('send/grade-announcement/:assessmentId')
  @RequirePermissions('notifications.create')
  @ApiOperation({ summary: 'Send grade announcements to parents' })
  async sendGradeAnnouncement(@Param('assessmentId') assessmentId: string) {
    return this.notificationsService.sendGradeAnnouncement(assessmentId);
  }

  @Post('send/payment-reminder')
  @RequirePermissions('notifications.create')
  @ApiOperation({ summary: 'Send payment reminder to parent' })
  async sendPaymentReminder(@Body() body: {
    studentId: string;
    amount: number;
    dueDate: string;
    description: string;
  }) {
    return this.notificationsService.sendPaymentReminder(body);
  }

  // ---- Logs ----

  @Get('logs')
  @ApiOperation({ summary: 'Get notification history logs' })
  async findLogs(
    @Query('type') type?: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.notificationsService.findLogs({
      type: type as any,
      channel: channel as any,
      status: status as any,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  async getStats() {
    return this.notificationsService.getStats();
  }

  @Delete('logs/:id')
  @RequirePermissions('notifications.delete')
  @ApiOperation({ summary: 'Delete notification log' })
  async deleteLog(@Param('id') id: string) {
    return this.notificationsService.deleteLog(id);
  }
}
