import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, NotificationType, NotificationChannel, NotificationStatus } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // TEMPLATES
  // ============================================================

  async findAllTemplates() {
    return this.prisma.notificationTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { logs: true } } },
    });
  }

  async findOneTemplate(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
      include: { _count: { select: { logs: true } } },
    });
    if (!template) throw new NotFoundException('Template notifikasi tidak ditemukan');
    return template;
  }

  async createTemplate(data: {
    name: string;
    type: NotificationType;
    subject: string;
    message: string;
  }) {
    return this.prisma.notificationTemplate.create({ data });
  }

  async updateTemplate(id: string, data: Partial<{
    name: string;
    type: NotificationType;
    subject: string;
    message: string;
    isActive: boolean;
  }>) {
    await this.findOneTemplate(id);
    return this.prisma.notificationTemplate.update({ where: { id }, data });
  }

  async deleteTemplate(id: string) {
    await this.findOneTemplate(id);
    return this.prisma.notificationTemplate.delete({ where: { id } });
  }

  // ============================================================
  // SEND NOTIFICATIONS
  // ============================================================

  /**
   * Send a single notification (simulated — in production, integrate with WhatsApp/SMS API)
   */
  async sendNotification(data: {
    templateId?: string;
    type: NotificationType;
    channel: NotificationChannel;
    recipientName: string;
    recipientPhone: string;
    subject: string;
    message: string;
    metadata?: any;
  }) {
    // Resolve template
    let templateId = data.templateId;
    if (!templateId && data.type) {
      const template = await this.prisma.notificationTemplate.findFirst({
        where: { type: data.type, isActive: true },
      });
      templateId = template?.id;
    }

    // Simulate sending
    let status: NotificationStatus = 'SENT';
    let errorMessage: string | null = null;

    if (!data.recipientPhone || data.recipientPhone.trim() === '') {
      status = 'FAILED';
      errorMessage = 'Nomor telepon tidak tersedia';
    } else if (data.channel === 'WHATSAPP') {
      // In production: call WhatsApp Business API
      // For now, simulate success
      status = 'SENT';
    } else if (data.channel === 'SMS') {
      // In production: call SMS gateway
      status = 'SENT';
    } else if (data.channel === 'IN_APP') {
      status = 'SENT';
    }

    const log = await this.prisma.notificationLog.create({
      data: {
        templateId,
        type: data.type,
        channel: data.channel,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        subject: data.subject,
        message: data.message,
        status,
        errorMessage,
        sentAt: status === 'SENT' ? new Date() : null,
        metadata: data.metadata || undefined,
      },
    });

    return { success: status === 'SENT', log, errorMessage };
  }

  /**
   * Bulk send notifications to multiple recipients
   */
  async bulkSend(data: {
    templateId?: string;
    type: NotificationType;
    channel: NotificationChannel;
    recipients: { name: string; phone: string }[];
    subject: string;
    message: string;
  }) {
    const results: { success: boolean; log: any; errorMessage: string | null }[] = [];
    for (const recipient of data.recipients) {
      const result = await this.sendNotification({
        templateId: data.templateId,
        type: data.type,
        channel: data.channel,
        recipientName: recipient.name,
        recipientPhone: recipient.phone,
        subject: data.subject,
        message: data.message,
      });
      results.push(result);
    }
    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    return { total: data.recipients.length, sent, failed, results };
  }

  // ============================================================
  // ATTENDANCE ALERTS
  // ============================================================

  /**
   * Send attendance alert to parents of absent students
   */
  async sendAttendanceAlert(sessionId: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        class: true,
        subject: true,
        records: {
          where: { status: 'ABSENT' },
          include: {
            student: {
              include: { parents: { where: { isPrimary: true } } },
            },
          },
        },
      },
    });

    if (!session) throw new NotFoundException('Sesi presensi tidak ditemukan');

    const dateStr = new Date(session.date).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const template = await this.prisma.notificationTemplate.findFirst({
      where: { type: 'ATTENDANCE_ALERT', isActive: true },
    });

    const results: { success: boolean; log: any; errorMessage: string | null }[] = [];
    for (const record of session.records) {
      const parent = record.student.parents[0];
      if (!parent || !parent.phone) continue;

      const message = (template?.message || 'Assalamu\'alaikum Wr. Wb.\n\nInformasi kehadiran {student_name} pada {date}:\n\nMata Pelajaran: {subject}\nStatus: TIDAK HADIR (Alpa)\n\nMohon perhatian dan izin dari Bapak/Ibu.\n\nHormat kami,\n{school_name}')
        .replace('{student_name}', record.student.fullName)
        .replace('{date}', dateStr)
        .replace('{subject}', session.subject?.name || '-')
        .replace('{class}', session.class?.name || '-')
        .replace('{school_name}', 'SMART MADIN');

      const subject = `Absen: ${record.student.fullName} - ${dateStr}`;

      const result = await this.sendNotification({
        templateId: template?.id,
        type: 'ATTENDANCE_ALERT',
        channel: 'WHATSAPP',
        recipientName: parent.name,
        recipientPhone: parent.phone,
        subject,
        message,
        metadata: { sessionId, studentId: record.studentId, status: 'ABSENT' },
      });
      results.push(result);
    }

    const sent = results.filter((r) => r.success).length;
    return { total: results.length, sent, failed: results.length - sent, absentCount: session.records.length };
  }

  // ============================================================
  // GRADE ANNOUNCEMENTS
  // ============================================================

  /**
   * Send grade announcement to parents of students in an assessment
   */
  async sendGradeAnnouncement(assessmentId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        class: true,
        subject: true,
        component: true,
        scores: {
          include: {
            student: {
              include: { parents: { where: { isPrimary: true } } },
            },
          },
        },
      },
    });

    if (!assessment) throw new NotFoundException('Penilaian tidak ditemukan');

    const template = await this.prisma.notificationTemplate.findFirst({
      where: { type: 'GRADE_ANNOUNCEMENT', isActive: true },
    });

    const results: { success: boolean; log: any; errorMessage: string | null }[] = [];
    for (const score of assessment.scores) {
      const parent = score.student.parents[0];
      if (!parent || !parent.phone) continue;

      const message = (template?.message || 'Assalamu\'alaikum Wr. Wb.\n\nHasil penilaian {student_name}:\n\nMata Pelajaran: {subject}\nPenilaian: {assessment_name}\nNilai: {score}/{max_score}\n\nSemangat belajar!\n\nHormat kami,\n{school_name}')
        .replace('{student_name}', score.student.fullName)
        .replace('{subject}', assessment.subject?.name || '-')
        .replace('{assessment_name}', assessment.title)
        .replace('{score}', String(score.score))
        .replace('{max_score}', String(assessment.maxScore))
        .replace('{class}', assessment.class?.name || '-')
        .replace('{school_name}', 'SMART MADIN');

      const subject = `Nilai: ${score.student.fullName} - ${assessment.title}`;

      const result = await this.sendNotification({
        templateId: template?.id,
        type: 'GRADE_ANNOUNCEMENT',
        channel: 'WHATSAPP',
        recipientName: parent.name,
        recipientPhone: parent.phone,
        subject,
        message,
        metadata: { assessmentId, studentId: score.studentId, score: score.score },
      });
      results.push(result);
    }

    const sent = results.filter((r) => r.success).length;
    return { total: results.length, sent, failed: results.length - sent, studentCount: assessment.scores.length };
  }

  // ============================================================
  // PAYMENT REMINDERS
  // ============================================================

  async sendPaymentReminder(data: {
    studentId: string;
    amount: number;
    dueDate: string;
    description: string;
  }) {
    const student = await this.prisma.student.findUnique({
      where: { id: data.studentId },
      include: { parents: { where: { isPrimary: true } } },
    });
    if (!student) throw new NotFoundException('Santri tidak ditemukan');

    const parent = student.parents[0];
    if (!parent || !parent.phone) {
      return { success: false, message: 'Nomor telepon orang tua tidak tersedia' };
    }

    const template = await this.prisma.notificationTemplate.findFirst({
      where: { type: 'PAYMENT_REMINDER', isActive: true },
    });

    const message = (template?.message || 'Assalamu\'alaikum Wr. Wb.\n\nInformasi pembayaran untuk {student_name}:\n\n{description}\nJumlah: Rp {amount}\nJatuh Tempo: {due_date}\n\nMohon untuk melakukan pembayaran tepat waktu.\n\nHormat kami,\n{school_name}')
      .replace('{student_name}', student.fullName)
      .replace('{description}', data.description)
      .replace('{amount}', data.amount.toLocaleString('id-ID'))
      .replace('{due_date}', data.dueDate)
      .replace('{school_name}', 'SMART MADIN');

    return this.sendNotification({
      templateId: template?.id,
      type: 'PAYMENT_REMINDER',
      channel: 'WHATSAPP',
      recipientName: parent.name,
      recipientPhone: parent.phone,
      subject: `Pembayaran: ${student.fullName}`,
      message,
      metadata: { studentId: data.studentId, amount: data.amount },
    });
  }

  // ============================================================
  // HISTORY / LOGS
  // ============================================================

  async findLogs(params: {
    type?: NotificationType;
    channel?: NotificationChannel;
    status?: NotificationStatus;
    page?: number;
    pageSize?: number;
  }) {
    const { type, channel, status, page = 1, pageSize = 20 } = params;
    const where: Prisma.NotificationLogWhereInput = {};
    if (type) where.type = type;
    if (channel) where.channel = channel;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return {
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getStats() {
    const [total, byStatus, byType, byChannel] = await Promise.all([
      this.prisma.notificationLog.count(),
      this.prisma.notificationLog.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.notificationLog.groupBy({
        by: ['type'],
        _count: { id: true },
      }),
      this.prisma.notificationLog.groupBy({
        by: ['channel'],
        _count: { id: true },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of byStatus) statusMap[s.status] = s._count.id;

    const typeMap: Record<string, number> = {};
    for (const t of byType) typeMap[t.type] = t._count.id;

    const channelMap: Record<string, number> = {};
    for (const c of byChannel) channelMap[c.channel] = c._count.id;

    return {
      total,
      byStatus: statusMap,
      byType: typeMap,
      byChannel: channelMap,
    };
  }

  async deleteLog(id: string) {
    return this.prisma.notificationLog.delete({ where: { id } });
  }
}
