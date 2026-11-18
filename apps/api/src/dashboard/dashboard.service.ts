import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const activeYear = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    const [
      totalStudents,
      activeStudents,
      maleStudents,
      femaleStudents,
      totalTeachers,
      totalStaff,
      activeClasses,
      totalLevels,
      newStudents,
      recentActivities,
      announcements,
    ] = await Promise.all([
      this.prisma.student.count({ where: { deletedAt: null } }),
      this.prisma.student.count({
        where: { status: 'ACTIVE', deletedAt: null },
      }),
      this.prisma.student.count({
        where: { gender: 'MALE', status: 'ACTIVE', deletedAt: null },
      }),
      this.prisma.student.count({
        where: { gender: 'FEMALE', status: 'ACTIVE', deletedAt: null },
      }),
      this.prisma.employee.count({
        where: { employeeType: 'TEACHER', deletedAt: null },
      }),
      this.prisma.employee.count({
        where: { employeeType: 'STAFF', deletedAt: null },
      }),
      activeYear
        ? this.prisma.class.count({
            where: { academicYearId: activeYear.id, isActive: true },
          })
        : 0,
      this.prisma.level.count({ where: { isActive: true } }),
      // New students this year
      activeYear
        ? this.prisma.studentClassHistory.count({
            where: {
              academicYearId: activeYear.id,
              startDate: { gte: activeYear.startDate },
            },
          })
        : 0,
      // Recent activities
      this.prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true, username: true } } },
      }),
      // Active announcements
      this.prisma.announcement.findMany({
        where: { isActive: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      academicYear: activeYear,
      stats: {
        totalStudents,
        activeStudents,
        maleStudents,
        femaleStudents,
        totalTeachers,
        totalStaff,
        activeClasses,
        totalLevels,
        newStudents,
      },
      recentActivities,
      announcements,
    };
  }

  async getStudentByLevel() {
    const activeYear = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!activeYear) return [];

    const levels = await this.prisma.level.findMany({
      where: { isActive: true },
      include: {
        classes: {
          where: { academicYearId: activeYear.id },
          include: {
            _count: {
              select: {
                studentClassHistories: { where: { status: 'ACTIVE' } },
              },
            },
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return levels.map((level) => ({
      level: level.name,
      count: level.classes.reduce(
        (sum, cls) => sum + (cls._count as any).studentClassHistories,
        0,
      ),
    }));
  }

  async getStudentByClass() {
    const activeYear = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!activeYear) return [];

    const classes = await this.prisma.class.findMany({
      where: { academicYearId: activeYear.id, isActive: true },
      include: {
        _count: {
          select: {
            studentClassHistories: { where: { status: 'ACTIVE' } },
          },
        },
        level: true,
      },
      orderBy: { code: 'asc' },
    });

    return classes.map((cls) => ({
      class: cls.name,
      level: cls.level.name,
      count: (cls._count as any).studentClassHistories,
    }));
  }

  async getTodaySchedule(classId?: string) {
    const today = new Date();
    const dayOfWeek = today.getDay();

    const activeYear = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!activeYear) return [];

    return this.prisma.schedule.findMany({
      where: {
        academicYearId: activeYear.id,
        dayOfWeek,
        ...(classId && { classId }),
      },
      include: {
        class: { include: { level: true } },
        subject: true,
        teacher: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  // ─── Monthly Enrollment Trends ───
  async getMonthlyTrends() {
    const activeYear = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
    });
    if (!activeYear) return [];

    const histories = await this.prisma.studentClassHistory.findMany({
      where: { academicYearId: activeYear.id },
      select: { startDate: true, status: true },
      orderBy: { startDate: 'asc' },
    });

    // Group by month
    const months: Record<string, { enrollment: number; active: number; left: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    // Initialize months from year start to now
    const start = new Date(activeYear.startDate);
    const now = new Date();
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { enrollment: 0, active: 0, left: 0 };
      cursor.setMonth(cursor.getMonth() + 1);
    }

    for (const h of histories) {
      const d = new Date(h.startDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { enrollment: 0, active: 0, left: 0 };
      months[key].enrollment++;
      if (h.status === 'ACTIVE') months[key].active++;
      if (h.status !== 'ACTIVE') months[key].left++;
    }

    return Object.entries(months).map(([key, data]) => {
      const [y, m] = key.split('-');
      return {
        month: `${monthNames[parseInt(m) - 1]} ${y}`,
        ...data,
      };
    });
  }

  // ─── Attendance Heatmap ───
  async getAttendanceHeatmap() {
    const activeYear = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
    });
    if (!activeYear) return { data: [], summary: {} };

    const sessions = await this.prisma.attendanceSession.findMany({
      where: { academicYearId: activeYear.id },
      include: { records: true },
    });

    const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const grid: Record<string, Record<string, { present: number; total: number }>> = {};

    for (const day of DAYS) {
      grid[day] = {};
    }

    for (const session of sessions) {
      const d = new Date(session.date);
      const dayName = DAYS[d.getDay()];
      const present = session.records.filter((r) => r.status === 'PRESENT').length;
      const total = session.records.length;

      if (!grid[dayName]) grid[dayName] = {};
      grid[dayName]['all'] = grid[dayName]['all'] || { present: 0, total: 0 };
      grid[dayName]['all'].present += present;
      grid[dayName]['all'].total += total;
    }

    const data = DAYS.filter((day) => grid[day]['all'] && grid[day]['all'].total > 0).map((day) => {
      const d = grid[day]['all'];
      return {
        day,
        sessions: sessions.filter((s) => {
          const dt = new Date(s.date);
          return DAYS[dt.getDay()] === day;
        }).length,
        present: d.present,
        total: d.total,
        rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
      };
    });

    // Overall stats
    let totalPresent = 0;
    let totalRecords = 0;
    for (const d of data) {
      totalPresent += d.present;
      totalRecords += d.total;
    }

    return {
      data,
      summary: {
        totalSessions: sessions.length,
        totalPresent,
        totalAbsent: totalRecords - totalPresent,
        overallRate: totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0,
      },
    };
  }

  // ─── Grade Distribution ───
  async getGradeDistribution() {
    const activeYear = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
    });
    if (!activeYear) return { distribution: [], summary: {} };

    const scores = await this.prisma.assessmentScore.findMany({
      where: { assessment: { academicYearId: activeYear.id } },
      include: { assessment: { select: { maxScore: true } } },
    });

    // Build histogram buckets
    const buckets = [
      { label: '0-19', min: 0, max: 19, count: 0, color: '#ef4444' },
      { label: '20-39', min: 20, max: 39, count: 0, color: '#f97316' },
      { label: '40-59', min: 40, max: 59, count: 0, color: '#f59e0b' },
      { label: '60-69', min: 60, max: 69, count: 0, color: '#84cc16' },
      { label: '70-79', min: 70, max: 79, count: 0, color: '#22c55e' },
      { label: '80-89', min: 80, max: 89, count: 0, color: '#06b6d4' },
      { label: '90-100', min: 90, max: 100, count: 0, color: '#3b82f6' },
    ];

    let totalScore = 0;
    let minScore = 100;
    let maxScore = 0;
    let count = 0;

    for (const s of scores) {
      const normalized = Math.round((s.score / s.assessment.maxScore) * 100);
      totalScore += normalized;
      if (normalized < minScore) minScore = normalized;
      if (normalized > maxScore) maxScore = normalized;
      count++;

      for (const bucket of buckets) {
        if (normalized >= bucket.min && normalized <= bucket.max) {
          bucket.count++;
          break;
        }
      }
    }

    return {
      distribution: buckets.map(({ label, count, color }) => ({ range: label, count, color })),
      summary: {
        totalScores: count,
        average: count > 0 ? Math.round(totalScore / count) : 0,
        min: count > 0 ? minScore : 0,
        max: count > 0 ? maxScore : 0,
      },
    };
  }
}
