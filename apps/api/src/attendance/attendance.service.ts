import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // SESSIONS
  // ============================================================

  async findSessions(params: {
    classId?: string;
    academicYearId?: string;
    date?: string;
    teacherId?: string;
    semester?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { classId, academicYearId, date, teacherId, semester, page = 1, pageSize = 20 } = params;

    const where: Prisma.AttendanceSessionWhereInput = {};
    if (classId) where.classId = classId;
    if (academicYearId) where.academicYearId = academicYearId;
    if (teacherId) where.teacherId = teacherId;
    if (semester) where.semester = semester as any;
    if (date) {
      const d = new Date(date);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      where.date = { gte: d, lt: next };
    }

    const [data, total] = await Promise.all([
      this.prisma.attendanceSession.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          class: { include: { level: true } },
          subject: true,
          teacher: { select: { id: true, fullName: true } },
          _count: { select: { records: true } },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.attendanceSession.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOneSession(id: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id },
      include: {
        class: { include: { level: true } },
        subject: true,
        teacher: { select: { id: true, fullName: true } },
        academicYear: true,
        records: {
          include: {
            student: {
              select: { id: true, studentNumber: true, fullName: true, gender: true },
            },
          },
          orderBy: { student: { fullName: 'asc' } },
        },
      },
    });
    if (!session) throw new NotFoundException('Sesi presensi tidak ditemukan');
    return session;
  }

  async createSession(data: {
    classId: string;
    academicYearId: string;
    date: string;
    teacherId: string;
    subjectId: string;
    semester?: string;
    notes?: string;
  }) {
    // Check if session already exists for same class, date, subject
    const dateObj = new Date(data.date);
    const nextDay = new Date(data.date);
    nextDay.setDate(nextDay.getDate() + 1);

    const existing = await this.prisma.attendanceSession.findFirst({
      where: {
        classId: data.classId,
        subjectId: data.subjectId,
        date: { gte: dateObj, lt: nextDay },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Sesi presensi untuk kelas ini pada tanggal dan mata pelajaran yang sama sudah ada',
      );
    }

    // Default to the academic year's currently active semester
    let semester: 'SATU' | 'DUA' = 'SATU';
    if (data.semester === 'SATU' || data.semester === 'DUA') {
      semester = data.semester;
    } else {
      const year = await this.prisma.academicYear.findUnique({
        where: { id: data.academicYearId },
        select: { activeSemester: true },
      });
      semester = year?.activeSemester ?? 'SATU';
    }

    const session = await this.prisma.attendanceSession.create({
      data: {
        classId: data.classId,
        academicYearId: data.academicYearId,
        date: dateObj,
        teacherId: data.teacherId,
        subjectId: data.subjectId,
        semester,
        notes: data.notes,
      },
      include: {
        class: { include: { level: true } },
        subject: true,
        teacher: { select: { id: true, fullName: true } },
      },
    });

    // Auto-create empty attendance records for all active students in class
    const activeHistories = await this.prisma.studentClassHistory.findMany({
      where: {
        classId: data.classId,
        academicYearId: data.academicYearId,
        status: 'ACTIVE',
      },
      select: { studentId: true },
    });

    if (activeHistories.length > 0) {
      await this.prisma.attendanceRecord.createMany({
        data: activeHistories.map((h) => ({
          sessionId: session.id,
          studentId: h.studentId,
          status: 'ABSENT' as const,
        })),
        skipDuplicates: true,
      });
    }

    return this.findOneSession(session.id);
  }

  async deleteSession(id: string) {
    const session = await this.prisma.attendanceSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Sesi presensi tidak ditemukan');
    return this.prisma.attendanceSession.delete({ where: { id } });
  }

  // ============================================================
  // RECORDS
  // ============================================================

  async updateRecord(
    sessionId: string,
    studentId: string,
    status: 'PRESENT' | 'SICK' | 'PERMISSION' | 'ABSENT',
    notes?: string,
  ) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Sesi presensi tidak ditemukan');

    // Upsert record
    const record = await this.prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentId: { sessionId, studentId },
      },
      update: { status, notes },
      create: { sessionId, studentId, status, notes },
    });

    return record;
  }

  async bulkUpdateRecords(
    sessionId: string,
    records: { studentId: string; status: 'PRESENT' | 'SICK' | 'PERMISSION' | 'ABSENT'; notes?: string }[],
  ) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Sesi presensi tidak ditemukan');

    const operations = records.map((r) =>
      this.prisma.attendanceRecord.upsert({
        where: {
          sessionId_studentId: { sessionId, studentId: r.studentId },
        },
        update: { status: r.status, notes: r.notes },
        create: { sessionId, studentId: r.studentId, status: r.status, notes: r.notes },
      }),
    );

    await this.prisma.$transaction(operations);

    return this.findOneSession(sessionId);
  }

  // ============================================================
  // STATS
  // ============================================================

  async getStats(academicYearId?: string) {
    const where: any = {};
    if (academicYearId) where.academicYearId = academicYearId;

    const [totalSessions, recordsByStatus] = await Promise.all([
      this.prisma.attendanceSession.count({ where }),
      this.prisma.attendanceRecord.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { session: where },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const r of recordsByStatus) {
      statusCounts[r.status] = r._count.id;
    }

    const totalRecords = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const presentCount = statusCounts['PRESENT'] || 0;
    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    return {
      totalSessions,
      totalRecords,
      presentCount,
      sickCount: statusCounts['SICK'] || 0,
      permissionCount: statusCounts['PERMISSION'] || 0,
      absentCount: statusCounts['ABSENT'] || 0,
      attendanceRate,
    };
  }

  async getStudentAttendance(studentId: string, academicYearId?: string) {
    const where: any = { studentId };
    if (academicYearId) {
      where.session = { academicYearId };
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
        session: {
          include: { class: { include: { level: true } }, subject: true },
        },
      },
      orderBy: { session: { date: 'desc' } },
    });

    const byStatus = { PRESENT: 0, SICK: 0, PERMISSION: 0, ABSENT: 0 };
    for (const r of records) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    }

    return { records, byStatus, total: records.length };
  }
}
