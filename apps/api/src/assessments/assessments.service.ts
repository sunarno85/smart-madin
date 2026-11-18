import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssessmentsService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // COMPONENTS
  // ============================================================

  async findComponents() {
    return this.prisma.assessmentComponent.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createComponent(data: { name: string; code: string; description?: string; weight?: number }) {
    return this.prisma.assessmentComponent.create({ data });
  }

  // ============================================================
  // ASSESSMENTS
  // ============================================================

  async findAssessments(params: {
    classId?: string;
    subjectId?: string;
    academicYearId?: string;
    componentId?: string;
    semester?: string;
  }) {
    const where: any = {};
    if (params.classId) where.classId = params.classId;
    if (params.subjectId) where.subjectId = params.subjectId;
    if (params.academicYearId) where.academicYearId = params.academicYearId;
    if (params.componentId) where.componentId = params.componentId;
    if (params.semester) where.semester = params.semester;

    return this.prisma.assessment.findMany({
      where,
      include: {
        class: { include: { level: true } },
        subject: true,
        component: true,
        academicYear: true,
        _count: { select: { scores: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneAssessment(id: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        class: { include: { level: true } },
        subject: true,
        component: true,
        academicYear: true,
        scores: {
          include: {
            student: {
              select: { id: true, studentNumber: true, fullName: true, gender: true },
            },
          },
          orderBy: { student: { fullName: 'asc' } },
        },
      },
    });
    if (!assessment) throw new NotFoundException('Penilaian tidak ditemukan');
    return assessment;
  }

  async createAssessment(data: {
    classId: string;
    academicYearId: string;
    subjectId: string;
    componentId: string;
    title: string;
    description?: string;
    maxScore?: number;
    semester?: string;
    date?: string;
  }) {
    // Default to the academic year's currently active semester
    let semester: 'SATU' | 'DUA' | undefined = undefined;
    if (data.semester === 'SATU' || data.semester === 'DUA') {
      semester = data.semester;
    } else {
      const year = await this.prisma.academicYear.findUnique({
        where: { id: data.academicYearId },
        select: { activeSemester: true },
      });
      semester = year?.activeSemester ?? 'SATU';
    }

    return this.prisma.assessment.create({
      data: {
        classId: data.classId,
        academicYearId: data.academicYearId,
        subjectId: data.subjectId,
        componentId: data.componentId,
        title: data.title,
        description: data.description,
        maxScore: data.maxScore ?? 100,
        semester,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: {
        class: { include: { level: true } },
        subject: true,
        component: true,
      },
    });
  }

  async deleteAssessment(id: string) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id } });
    if (!assessment) throw new NotFoundException('Penilaian tidak ditemukan');
    return this.prisma.assessment.delete({ where: { id } });
  }

  // ============================================================
  // SCORES
  // ============================================================

  async updateScore(
    assessmentId: string,
    studentId: string,
    score: number,
    notes?: string,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!assessment) throw new NotFoundException('Penilaian tidak ditemukan');

    if (score < 0 || score > assessment.maxScore) {
      throw new BadRequestException(
        `Nilai harus antara 0 dan ${assessment.maxScore}`,
      );
    }

    return this.prisma.assessmentScore.upsert({
      where: {
        assessmentId_studentId: { assessmentId, studentId },
      },
      update: { score, notes },
      create: { assessmentId, studentId, score, notes },
    });
  }

  async bulkUpdateScores(
    assessmentId: string,
    scores: { studentId: string; score: number; notes?: string }[],
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { class: true, academicYear: true },
    });
    if (!assessment) throw new NotFoundException('Penilaian tidak ditemukan');

    // Validate all scores
    for (const s of scores) {
      if (s.score < 0 || s.score > assessment.maxScore) {
        throw new BadRequestException(
          `Nilai untuk student ${s.studentId} harus antara 0 dan ${assessment.maxScore}`,
        );
      }
    }

    const operations = scores.map((s) =>
      this.prisma.assessmentScore.upsert({
        where: {
          assessmentId_studentId: { assessmentId, studentId: s.studentId },
        },
        update: { score: s.score, notes: s.notes },
        create: { assessmentId, studentId: s.studentId, score: s.score, notes: s.notes },
      }),
    );

    await this.prisma.$transaction(operations);

    return this.findOneAssessment(assessmentId);
  }

  // ============================================================
  // RECAP - Student grades summary
  // ============================================================

  async getStudentRecap(
    classId: string,
    academicYearId: string,
    subjectId?: string,
    semester?: string,
  ) {
    // Get all students in class
    const histories = await this.prisma.studentClassHistory.findMany({
      where: { classId, academicYearId, status: 'ACTIVE' },
      include: {
        student: {
          select: { id: true, studentNumber: true, fullName: true, gender: true },
        },
      },
    });

    // Get all assessments for this class/year
    const where: any = { classId, academicYearId };
    if (subjectId) where.subjectId = subjectId;
    if (semester) where.semester = semester;

    const assessments = await this.prisma.assessment.findMany({
      where,
      include: {
        component: true,
        subject: true,
        scores: {
          select: { studentId: true, score: true },
        },
      },
      orderBy: [{ subject: { name: 'asc' } }, { component: { name: 'asc' } }],
    });

    // Calculate average per student
    const students = histories.map((h) => {
      const studentScores = assessments.map((a) => {
        const scoreRecord = a.scores.find((s) => s.studentId === h.studentId);
        return {
          assessmentId: a.id,
          assessmentTitle: a.title,
          component: a.component.name,
          componentCode: a.component.code,
          subject: a.subject.name,
          maxScore: a.maxScore,
          score: scoreRecord?.score ?? null,
        };
      });

      // Calculate weighted average
      const scored = studentScores.filter((s) => s.score !== null);
      const avgScore =
        scored.length > 0
          ? Math.round(
              (scored.reduce((sum, s) => sum + (s.score || 0), 0) / scored.length) * 100,
            ) / 100
          : null;

      return {
        ...h.student,
        scores: studentScores,
        averageScore: avgScore,
        totalAssessments: assessments.length,
        completedAssessments: scored.length,
      };
    });

    return { students, assessments: assessments.map((a) => ({
      id: a.id,
      title: a.title,
      component: a.component.name,
      subject: a.subject.name,
      maxScore: a.maxScore,
    }))};
  }

  // ============================================================
  // STATS
  // ============================================================

  async getStats(academicYearId?: string) {
    const where: any = {};
    if (academicYearId) where.academicYearId = academicYearId;

    const [totalAssessments, totalScores] = await Promise.all([
      this.prisma.assessment.count({ where }),
      this.prisma.assessmentScore.count({
        where: { assessment: where },
      }),
    ]);

    const avgResult = await this.prisma.assessmentScore.aggregate({
      where: { assessment: where },
      _avg: { score: true },
      _min: { score: true },
      _max: { score: true },
    });

    return {
      totalAssessments,
      totalScores,
      averageScore: avgResult._avg.score
        ? Math.round(avgResult._avg.score * 100) / 100
        : 0,
      minScore: avgResult._min.score ?? 0,
      maxScore: avgResult._max.score ?? 0,
    };
  }

  // ============================================================
  // RUBRIC TEMPLATES
  // ============================================================

  async findRubricTemplates() {
    return this.prisma.rubricTemplate.findMany({
      include: {
        criteria: {
          include: { levels: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneRubricTemplate(id: string) {
    const template = await this.prisma.rubricTemplate.findUnique({
      where: { id },
      include: {
        criteria: {
          include: { levels: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!template) throw new NotFoundException('Template rubrik tidak ditemukan');
    return template;
  }

  async createRubricTemplate(data: {
    name: string;
    description?: string;
    maxScore?: number;
    criteria?: { name: string; description?: string; weight?: number; maxScore?: number; levels?: { label: string; minScore: number; maxScore: number; description?: string }[] }[];
  }) {
    return this.prisma.rubricTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        maxScore: data.maxScore ?? 100,
        criteria: data.criteria ? {
          create: data.criteria.map((c, i) => ({
            name: c.name,
            description: c.description,
            weight: c.weight ?? 1,
            maxScore: c.maxScore ?? 100,
            order: i,
            levels: c.levels ? {
              create: c.levels.map((l, j) => ({
                label: l.label,
                minScore: l.minScore,
                maxScore: l.maxScore,
                description: l.description,
                order: j,
              })),
            } : undefined,
          })),
        } : undefined,
      },
      include: {
        criteria: {
          include: { levels: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async updateRubricTemplate(id: string, data: Partial<{ name: string; description: string; maxScore: number; isActive: boolean }>) {
    await this.findOneRubricTemplate(id);
    return this.prisma.rubricTemplate.update({ where: { id }, data });
  }

  async deleteRubricTemplate(id: string) {
    await this.findOneRubricTemplate(id);
    return this.prisma.rubricTemplate.delete({ where: { id } });
  }

  // ============================================================
  // GPA CALCULATION
  // ============================================================

  async getGPACalculator(
    classId: string,
    academicYearId: string,
    semester?: string,
  ) {
    // Get all active students in class
    const histories = await this.prisma.studentClassHistory.findMany({
      where: { classId, academicYearId, status: 'ACTIVE' },
      include: {
        student: {
          select: { id: true, studentNumber: true, fullName: true, gender: true },
        },
      },
    });

    // Get all assessments for this class
    const assessmentWhere: any = { classId, academicYearId };
    if (semester) assessmentWhere.semester = semester;
    const assessments = await this.prisma.assessment.findMany({
      where: assessmentWhere,
      include: {
        component: true,
        subject: true,
        scores: { select: { studentId: true, score: true } },
      },
    });

    // Get components for weight calculation
    const components = await this.prisma.assessmentComponent.findMany();
    const componentWeightMap: Record<string, number> = {};
    for (const c of components) componentWeightMap[c.id] = c.weight || 1;

    // Calculate GPA per student
    const students = histories.map((h) => {
      const studentScores = assessments.map((a) => {
        const scoreRecord = a.scores.find((s) => s.studentId === h.studentId);
        return {
          assessmentId: a.id,
          assessmentTitle: a.title,
          component: a.component.name,
          componentId: a.component.id,
          subject: a.subject.name,
          subjectId: a.subject.id,
          maxScore: a.maxScore,
          score: scoreRecord?.score ?? null,
          weight: componentWeightMap[a.component.id] || 1,
        };
      });

      // Group by subject for subject-level averages
      const subjectMap: Record<string, { scores: number[]; total: number; count: number }> = {};
      for (const s of studentScores) {
        if (s.score === null) continue;
        if (!subjectMap[s.subject]) subjectMap[s.subject] = { scores: [], total: 0, count: 0 };
        subjectMap[s.subject].scores.push(s.score);
        subjectMap[s.subject].total += s.score * s.weight;
        subjectMap[s.subject].count += s.weight;
      }

      const subjectAverages = Object.entries(subjectMap).map(([subject, data]) => ({
        subject,
        average: data.count > 0 ? Math.round((data.total / data.count) * 100) / 100 : 0,
        scoreCount: data.scores.length,
      }));

      // Overall GPA: weighted average across all scored assessments
      const scored = studentScores.filter((s) => s.score !== null);
      const totalWeightedScore = scored.reduce((sum, s) => sum + (s.score || 0) * s.weight, 0);
      const totalWeight = scored.reduce((sum, s) => sum + s.weight, 0);
      const gpa = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) / 100 : null;

      // Letter grade
      let letterGrade = '-';
      if (gpa !== null) {
        if (gpa >= 90) letterGrade = 'A';
        else if (gpa >= 80) letterGrade = 'B';
        else if (gpa >= 70) letterGrade = 'C';
        else if (gpa >= 60) letterGrade = 'D';
        else letterGrade = 'E';
      }

      return {
        ...h.student,
        gpa,
        letterGrade,
        subjectAverages,
        totalScored: scored.length,
        totalAssessments: assessments.length,
      };
    });

    // Class statistics
    const gpas = students.filter((s) => s.gpa !== null).map((s) => s.gpa!);
    const classAvg = gpas.length > 0 ? Math.round((gpas.reduce((a, b) => a + b, 0) / gpas.length) * 100) / 100 : 0;

    return {
      students: students.sort((a, b) => (b.gpa || 0) - (a.gpa || 0)),
      classAverage: classAvg,
      highestGpa: gpas.length > 0 ? Math.max(...gpas) : 0,
      lowestGpa: gpas.length > 0 ? Math.min(...gpas) : 0,
      totalStudents: students.length,
      gradedStudents: gpas.length,
    };
  }
}
