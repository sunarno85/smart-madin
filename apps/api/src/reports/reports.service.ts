import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ─── Student Statistics ───
  async getStudentStats(academicYearId?: string) {
    const where: any = { deletedAt: null };
    if (academicYearId) {
      where.classHistories = { some: { academicYearId, status: 'ACTIVE' } };
    }

    const [totalStudents, activeStudents, byGender, byLevel, byStatus, allStudents] = await Promise.all([
      this.prisma.student.count({ where }),
      this.prisma.student.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.student.groupBy({
        by: ['gender'],
        _count: true,
        where,
      }),
      this.prisma.studentClassHistory.groupBy({
        by: ['classId'],
        _count: true,
        where: academicYearId ? { academicYearId, status: 'ACTIVE' } : { status: 'ACTIVE' },
      }),
      this.prisma.student.groupBy({
        by: ['status'],
        _count: true,
        where,
      }),
      this.prisma.student.findMany({
        where,
        include: {
          classHistories: {
            where: academicYearId ? { academicYearId, status: 'ACTIVE' } : { status: 'ACTIVE' },
            include: { class: { include: { level: true } } },
          },
          parents: true,
        },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    // Resolve class names for level stats
    const classIds = byLevel.map((r) => r.classId);
    const classes = await this.prisma.class.findMany({
      where: { id: { in: classIds } },
      include: { level: true },
    });
    const classMap = new Map(classes.map((c) => [c.id, c]));

    const levelStats: Record<string, number> = {};
    for (const item of byLevel) {
      const cls = classMap.get(item.classId);
      const levelName = cls?.level?.name || 'Unknown';
      levelStats[levelName] = (levelStats[levelName] || 0) + item._count;
    }

    return {
      totalStudents,
      activeStudents,
      byGender: byGender.reduce((acc, r) => ({ ...acc, [r.gender]: r._count }), {}),
      byLevel: levelStats,
      byStatus: byStatus.reduce((acc, r) => ({ ...acc, [r.status]: r._count }), {}),
      students: allStudents.map((s) => ({
        id: s.id,
        studentNumber: s.studentNumber,
        fullName: s.fullName,
        gender: s.gender,
        status: s.status,
        className: s.classHistories[0]?.class?.name || '-',
        levelName: s.classHistories[0]?.class?.level?.name || '-',
        parentCount: s.parents.length,
      })),
    };
  }

  // ─── Attendance Recap ───
  async getAttendanceRecap(params: {
    academicYearId?: string;
    classId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { academicYearId, classId, startDate, endDate } = params;

    const sessionWhere: any = {};
    if (academicYearId) sessionWhere.academicYearId = academicYearId;
    if (classId) sessionWhere.classId = classId;
    if (startDate || endDate) {
      sessionWhere.date = {};
      if (startDate) sessionWhere.date.gte = new Date(startDate);
      if (endDate) sessionWhere.date.lte = new Date(endDate);
    }

    const sessions = await this.prisma.attendanceSession.findMany({
      where: sessionWhere,
      include: {
        class: { include: { level: true } },
        subject: true,
        teacher: true,
        records: {
          include: { student: true },
        },
      },
      orderBy: [{ date: 'asc' }, { class: { name: 'asc' } }],
    });

    // Group by class
    const byClass: Record<string, any> = {};
    for (const session of sessions) {
      const className = session.class.name;
      if (!byClass[className]) {
        byClass[className] = {
          classId: session.classId,
          className,
          levelName: session.class.level?.name || '-',
          totalSessions: 0,
          students: {},
        };
      }
      byClass[className].totalSessions++;

      for (const record of session.records) {
        const sid = record.studentId;
        if (!byClass[className].students[sid]) {
          byClass[className].students[sid] = {
            studentId: sid,
            studentName: record.student.fullName,
            studentNumber: record.student.studentNumber,
            gender: record.student.gender,
            PRESENT: 0,
            SICK: 0,
            PERMISSION: 0,
            ABSENT: 0,
            total: 0,
          };
        }
        byClass[className].students[sid][record.status]++;
        byClass[className].students[sid].total++;
      }
    }

    // Convert to arrays with rates
    const recap = Object.values(byClass).map((cls) => ({
      ...cls,
      students: Object.values(cls.students).map((s: any) => ({
        ...s,
        attendanceRate: s.total > 0 ? Math.round((s.PRESENT / s.total) * 100) : 0,
      })),
      totalStudents: Object.keys(cls.students).length,
    }));

    // Summary
    let totalSessions = 0;
    let totalPresent = 0;
    let totalSick = 0;
    let totalPermission = 0;
    let totalAbsent = 0;
    for (const cls of recap) {
      totalSessions += cls.totalSessions;
      for (const s of cls.students) {
        totalPresent += s.PRESENT;
        totalSick += s.SICK;
        totalPermission += s.PERMISSION;
        totalAbsent += s.ABSENT;
      }
    }
    const totalRecords = totalPresent + totalSick + totalPermission + totalAbsent;

    return {
      summary: {
        totalSessions,
        totalRecords,
        totalPresent,
        totalSick,
        totalPermission,
        totalAbsent,
        attendanceRate: totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0,
      },
      byClass: recap,
      sessions: sessions.map((s) => ({
        id: s.id,
        date: s.date,
        className: s.class.name,
        subjectName: s.subject.name,
        teacherName: s.teacher.fullName,
        present: s.records.filter((r) => r.status === 'PRESENT').length,
        sick: s.records.filter((r) => r.status === 'SICK').length,
        permission: s.records.filter((r) => r.status === 'PERMISSION').length,
        absent: s.records.filter((r) => r.status === 'ABSENT').length,
        total: s.records.length,
      })),
    };
  }

  // ─── Grade Recap ───
  async getGradeRecap(params: {
    academicYearId?: string;
    classId?: string;
    subjectId?: string;
  }) {
    const { academicYearId, classId, subjectId } = params;

    const where: any = {};
    if (academicYearId) where.academicYearId = academicYearId;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    const assessments = await this.prisma.assessment.findMany({
      where,
      include: {
        class: { include: { level: true } },
        subject: true,
        component: true,
        scores: { include: { student: true } },
      },
      orderBy: [{ class: { name: 'asc' } }, { subject: { name: 'asc' } }],
    });

    // Group by class
    const byClass: Record<string, any> = {};
    for (const assessment of assessments) {
      const className = assessment.class.name;
      if (!byClass[className]) {
        byClass[className] = {
          classId: assessment.classId,
          className,
          levelName: assessment.class.level?.name || '-',
          assessments: [],
          students: {},
        };
      }

      const aEntry = {
        id: assessment.id,
        title: assessment.title,
        subjectName: assessment.subject.name,
        componentName: assessment.component.name,
        maxScore: assessment.maxScore,
        studentCount: assessment.scores.length,
        averageScore:
          assessment.scores.length > 0
            ? Math.round(
                (assessment.scores.reduce((sum, s) => sum + s.score, 0) /
                  assessment.scores.length) *
                  10,
              ) / 10
            : 0,
      };
      byClass[className].assessments.push(aEntry);

      for (const score of assessment.scores) {
        const sid = score.studentId;
        if (!byClass[className].students[sid]) {
          byClass[className].students[sid] = {
            studentId: sid,
            studentName: score.student.fullName,
            studentNumber: score.student.studentNumber,
            gender: score.student.gender,
            scores: [],
            totalScore: 0,
            count: 0,
          };
        }
        byClass[className].students[sid].scores.push({
          assessmentId: assessment.id,
          assessmentTitle: assessment.title,
          componentName: assessment.component.name,
          score: score.score,
          maxScore: assessment.maxScore,
        });
        byClass[className].students[sid].totalScore += score.score;
        byClass[className].students[sid].count++;
      }
    }

    const recap = Object.values(byClass).map((cls) => ({
      ...cls,
      students: Object.values(cls.students).map((s: any) => ({
        ...s,
        averageScore: s.count > 0 ? Math.round((s.totalScore / s.count) * 10) / 10 : 0,
      })),
      totalAssessments: cls.assessments.length,
    }));

    return { byClass: recap };
  }

  // ─── Employee Statistics ───
  async getEmployeeStats() {
    const [totalEmployees, byType, byStatus, employees] = await Promise.all([
      this.prisma.employee.count({ where: { deletedAt: null } }),
      this.prisma.employee.groupBy({
        by: ['employeeType'],
        _count: true,
        where: { deletedAt: null },
      }),
      this.prisma.employee.groupBy({
        by: ['activityStatus'],
        _count: true,
        where: { deletedAt: null },
      }),
      this.prisma.employee.findMany({
        where: { deletedAt: null },
        include: {
          teacherSubjects: { include: { subject: true } },
          homeroomClasses: true,
          schedules: true,
          users: true,
        },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    return {
      totalEmployees,
      byType: byType.reduce((acc, r) => ({ ...acc, [r.employeeType]: r._count }), {}),
      byStatus: byStatus.reduce((acc, r) => ({ ...acc, [r.activityStatus]: r._count }), {}),
      employees: employees.map((e) => ({
        id: e.id,
        employeeNumber: e.employeeNumber,
        nik: e.nik,
        fullName: e.fullName,
        gender: e.gender,
        employeeType: e.employeeType,
        activityStatus: e.activityStatus,
        subjectArea: e.subjectArea,
        phone: e.phone,
        email: e.email,
        educationLevel: e.educationLevel,
        subjectCount: e.teacherSubjects.length,
        homeroomCount: e.homeroomClasses.length,
        scheduleCount: e.schedules.length,
        hasUser: e.users.length > 0,
        subjects: e.teacherSubjects.map((ts) => ts.subject.name),
      })),
    };
  }

  // ============================================================
  // SHARED HELPERS - weighted subject averages & letter grades
  // ============================================================

  private letterGrade(avg: number | null): string {
    if (avg === null) return '-';
    if (avg >= 90) return 'A';
    if (avg >= 80) return 'B';
    if (avg >= 70) return 'C';
    if (avg >= 60) return 'D';
    return 'E';
  }

  private predicate(letter: string): string {
    switch (letter) {
      case 'A': return 'Sangat Baik';
      case 'B': return 'Baik';
      case 'C': return 'Cukup';
      case 'D': return 'Kurang';
      case 'E': return 'Perlu Bimbingan';
      default: return '-';
    }
  }

  private weightedSubjectAverage(
    scores: { score: number; weight: number }[],
  ): number | null {
    if (scores.length === 0) return null;
    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight <= 0) {
      return (
        Math.round(
          (scores.reduce((sum, s) => sum + s.score, 0) / scores.length) * 100,
        ) / 100
      );
    }
    const weighted = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
    return Math.round((weighted / totalWeight) * 100) / 100;
  }

  // ============================================================
  // RAPOR - per-student report card for a semester
  // ============================================================

  async getRapor(studentId: string, academicYearId?: string, semester?: string) {
    // Default to the active academic year
    let yearId = academicYearId;
    if (!yearId) {
      const active = await this.prisma.academicYear.findFirst({
        where: { isActive: true },
      });
      if (!active) throw new BadRequestException('Belum ada tahun ajaran aktif');
      yearId = active.id;
    }

    const history = await this.prisma.studentClassHistory.findFirst({
      where: { studentId, academicYearId: yearId, status: 'ACTIVE' },
      include: {
        class: { include: { level: true } },
        academicYear: true,
      },
      orderBy: { startDate: 'desc' },
    });
    if (!history) {
      throw new NotFoundException(
        'Santri tidak terdaftar di kelas manapun pada tahun ajaran ini',
      );
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { parents: true },
    });
    if (!student) throw new NotFoundException('Santri tidak ditemukan');

    const semesterFilter: any = { classId: history.classId, academicYearId: yearId };
    if (semester) semesterFilter.semester = semester;

    const assessments = await this.prisma.assessment.findMany({
      where: semesterFilter,
      include: {
        subject: true,
        component: true,
        scores: { where: { studentId } },
      },
      orderBy: [{ subject: { name: 'asc' } }, { createdAt: 'asc' }],
    });

    const components = await this.prisma.assessmentComponent.findMany();
    const componentWeight = new Map(components.map((c) => [c.id, c.weight || 1]));

    // Group scores by subject
    const subjectMap: Record<
      string,
      {
        subjectId: string;
        subjectName: string;
        subjectNameArabic: string | null;
        items: { title: string; component: string; score: number | null; maxScore: number }[];
        weightedScores: { score: number; weight: number }[];
      }
    > = {};
    for (const a of assessments) {
      if (!subjectMap[a.subjectId]) {
        subjectMap[a.subjectId] = {
          subjectId: a.subjectId,
          subjectName: a.subject.name,
          subjectNameArabic: a.subject.nameArabic ?? null,
          items: [],
          weightedScores: [],
        };
      }
      const score = a.scores[0]?.score ?? null;
      subjectMap[a.subjectId].items.push({
        title: a.title,
        component: a.component.name,
        score,
        maxScore: a.maxScore,
      });
      if (score !== null) {
        subjectMap[a.subjectId].weightedScores.push({
          score,
          weight: componentWeight.get(a.componentId) || 1,
        });
      }
    }

    const subjects = Object.values(subjectMap).map((s) => {
      const average = this.weightedSubjectAverage(s.weightedScores);
      const letter = this.letterGrade(average);
      return {
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        subjectNameArabic: s.subjectNameArabic,
        items: s.items,
        average,
        letterGrade: letter,
        predicate: this.predicate(letter),
      };
    });

    // Attendance recap for the same class/semester
    const sessionWhere: any = { classId: history.classId, academicYearId: yearId };
    if (semester) sessionWhere.semester = semester;
    const attendanceCounts = { PRESENT: 0, SICK: 0, PERMISSION: 0, ABSENT: 0 };
    const [sessionCount, records] = await Promise.all([
      this.prisma.attendanceSession.count({ where: sessionWhere }),
      this.prisma.attendanceRecord.findMany({
        where: { studentId, session: sessionWhere },
        select: { status: true },
      }),
    ]);
    for (const r of records) attendanceCounts[r.status]++;

    const scoredSubjects = subjects.filter((s) => s.average !== null) as { average: number }[];
    const overallAverage =
      scoredSubjects.length > 0
        ? Math.round(
            (scoredSubjects.reduce((sum, s) => sum + s.average, 0) / scoredSubjects.length) * 100,
          ) / 100
        : null;
    const overallLetter = this.letterGrade(overallAverage);

    return {
      student: {
        id: student.id,
        studentNumber: student.studentNumber,
        nisn: student.nisn,
        fullName: student.fullName,
        gender: student.gender,
        birthPlace: student.birthPlace,
        birthDate: student.birthDate,
        address: student.address,
        parents: student.parents.map((p) => ({
          relationship: p.relationship,
          name: p.name,
          phone: p.phone,
        })),
      },
      academicYear: {
        id: history.academicYear.id,
        name: history.academicYear.name,
        semester: semester ?? history.academicYear.activeSemester,
      },
      class: {
        id: history.class.id,
        name: history.class.name,
        level: history.class.level?.name ?? '-',
      },
      subjects,
      attendance: {
        totalSessions: sessionCount,
        ...attendanceCounts,
      },
      overall: {
        average: overallAverage,
        letterGrade: overallLetter,
        predicate: this.predicate(overallLetter),
      },
    };
  }

  // ============================================================
  // LEGER - class-wide grades matrix for a semester
  // ============================================================

  async getLeger(classId: string, academicYearId?: string, semester?: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { level: true, academicYear: true },
    });
    if (!cls) throw new NotFoundException('Kelas tidak ditemukan');

    const yearId = academicYearId ?? cls.academicYearId;
    const year = await this.prisma.academicYear.findUnique({ where: { id: yearId } });
    if (!year) throw new NotFoundException('Tahun ajaran tidak ditemukan');

    const histories = await this.prisma.studentClassHistory.findMany({
      where: { classId, academicYearId: yearId, status: 'ACTIVE' },
      include: {
        student: {
          select: { id: true, studentNumber: true, fullName: true, gender: true },
        },
      },
      orderBy: { student: { fullName: 'asc' } },
    });

    const semesterFilter: any = { classId, academicYearId: yearId };
    if (semester) semesterFilter.semester = semester;

    const assessments = await this.prisma.assessment.findMany({
      where: semesterFilter,
      include: {
        subject: true,
        component: true,
        scores: { select: { studentId: true, score: true } },
      },
      orderBy: [{ subject: { name: 'asc' } }, { createdAt: 'asc' }],
    });

    const components = await this.prisma.assessmentComponent.findMany();
    const componentWeight = new Map(components.map((c) => [c.id, c.weight || 1]));

    // Distinct subjects preserving order
    const subjectList: { id: string; name: string; nameArabic: string | null }[] = [];
    const seen = new Set<string>();
    for (const a of assessments) {
      if (!seen.has(a.subjectId)) {
        seen.add(a.subjectId);
        subjectList.push({
          id: a.subjectId,
          name: a.subject.name,
          nameArabic: a.subject.nameArabic ?? null,
        });
      }
    }

    // Attendance per student
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: { session: { classId, academicYearId: yearId, ...(semester ? { semester: semester as any } : {}) } },
      select: { studentId: true, status: true },
    });
    const attMap: Record<string, { PRESENT: number; SICK: number; PERMISSION: number; ABSENT: number }> = {};
    for (const r of attendanceRecords) {
      if (!attMap[r.studentId]) {
        attMap[r.studentId] = { PRESENT: 0, SICK: 0, PERMISSION: 0, ABSENT: 0 };
      }
      attMap[r.studentId][r.status]++;
    }

    const students = histories.map((h) => {
      const subjectAverages = subjectList.map((subj) => {
        const weightedScores = assessments
          .filter((a) => a.subjectId === subj.id)
          .map((a) => ({
            score: a.scores.find((s) => s.studentId === h.studentId)?.score ?? null,
            weight: componentWeight.get(a.componentId) || 1,
          }))
          .filter((x) => x.score !== null)
          .map((x) => ({ score: x.score as number, weight: x.weight }));
        const average = this.weightedSubjectAverage(weightedScores);
        return {
          subjectId: subj.id,
          average,
          letterGrade: this.letterGrade(average),
        };
      });

      const scored = subjectAverages.filter((s) => s.average !== null) as { average: number }[];
      const finalAverage =
        scored.length > 0
          ? Math.round(
              (scored.reduce((sum, s) => sum + s.average as number, 0) / scored.length) * 100,
            ) / 100
          : null;

      const att = attMap[h.studentId] ?? {
        PRESENT: 0, SICK: 0, PERMISSION: 0, ABSENT: 0,
      };

      return {
        student: h.student,
        subjectAverages,
        finalAverage,
        letterGrade: this.letterGrade(finalAverage),
        attendance: att,
      };
    });

    // Rank by final average (students without scores go last)
    const ranked = [...students].sort((a, b) => (b.finalAverage ?? -1) - (a.finalAverage ?? -1));
    const rankByStudentId = new Map<string, number>();
    ranked.forEach((s, idx) => rankByStudentId.set(s.student.id, idx + 1));

    const classAverageScores = students
      .filter((s) => s.finalAverage !== null)
      .map((s) => s.finalAverage as number);
    const classAverage =
      classAverageScores.length > 0
        ? Math.round(
            (classAverageScores.reduce((a, b) => a + b, 0) / classAverageScores.length) * 100,
          ) / 100
        : null;

    return {
      class: {
        id: cls.id,
        name: cls.name,
        level: cls.level?.name ?? '-',
      },
      academicYear: {
        id: year.id,
        name: year.name,
        semester: semester ?? year.activeSemester,
      },
      subjects: subjectList,
      students: students.map((s) => ({
        ...s,
        rank: rankByStudentId.get(s.student.id) ?? null,
      })),
      classAverage,
    };
  }

  // ============================================================
  // LEGER EXPORT - Excel (xlsx)
  // ============================================================

  async exportLegerExcel(classId: string, academicYearId?: string, semester?: string) {
    const leger = await this.getLeger(classId, academicYearId, semester);

    const semesterLabel = leger.academicYear.semester === 'DUA' ? 'Semester 2' : 'Semester 1';
    const aoa: (string | number)[][] = [];
    aoa.push(['LEGER NILAI']);
    aoa.push([
      `${leger.class.name} (${leger.class.level}) - ${leger.academicYear.name} - ${semesterLabel}`,
    ]);
    aoa.push([]);
    aoa.push([
      'No',
      'NIS',
      'Nama Santri',
      ...leger.subjects.map((s) => s.name),
      'Rata-rata',
      'Predikat',
      'Hadir',
      'Sakit',
      'Izin',
      'Alpa',
    ]);

    leger.students.forEach((s, idx) => {
      const row: (string | number)[] = [
        idx + 1,
        s.student.studentNumber,
        s.student.fullName,
      ];
      for (const subj of leger.subjects) {
        const val = s.subjectAverages.find((a) => a.subjectId === subj.id)?.average;
        row.push(val === null || val === undefined ? '-' : (val as number));
      }
      row.push(
        s.finalAverage === null ? '-' : (s.finalAverage as number),
        s.letterGrade,
        s.attendance.PRESENT,
        s.attendance.SICK,
        s.attendance.PERMISSION,
        s.attendance.ABSENT,
      );
      aoa.push(row);
    });

    aoa.push([]);
    aoa.push(['Rata-rata Kelas', leger.classAverage ?? '-']);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 4 }, { wch: 10 }, { wch: 28 },
      ...leger.subjects.map(() => ({ wch: 10 })),
      { wch: 10 }, { wch: 9 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leger');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    const safeClassName = leger.class.name.replace(/[^\w-]+/g, '_');
    return { buffer, filename: `Leger_${safeClassName}_${semesterLabel.replace(/\s+/g, '')}.xlsx` };
  }
}
