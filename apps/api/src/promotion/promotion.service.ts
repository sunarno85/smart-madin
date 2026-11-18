import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type PromotionAction = 'PROMOTE' | 'REPEAT' | 'GRADUATE';

interface PromotionItem {
  studentId: string;
  action: PromotionAction;
  targetClassId?: string;
}

@Injectable()
export class PromotionService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // CLASS ROLLOVER - copy class structure to a new academic year
  // ============================================================

  async rolloverClasses(fromAcademicYearId: string, toAcademicYearId: string) {
    if (fromAcademicYearId === toAcademicYearId) {
      throw new BadRequestException(
        'Tahun ajaran asal dan tujuan tidak boleh sama',
      );
    }

    const [fromYear, toYear] = await Promise.all([
      this.prisma.academicYear.findUnique({ where: { id: fromAcademicYearId } }),
      this.prisma.academicYear.findUnique({ where: { id: toAcademicYearId } }),
    ]);
    if (!fromYear) throw new NotFoundException('Tahun ajaran asal tidak ditemukan');
    if (!toYear) throw new NotFoundException('Tahun ajaran tujuan tidak ditemukan');

    const sourceClasses = await this.prisma.class.findMany({
      where: { academicYearId: fromAcademicYearId },
      include: { level: true },
      orderBy: [{ level: { displayOrder: 'asc' } }, { name: 'asc' }],
    });
    if (sourceClasses.length === 0) {
      throw new BadRequestException(
        'Tahun ajaran asal belum memiliki kelas',
      );
    }

    const existingTarget = await this.prisma.class.findMany({
      where: { academicYearId: toAcademicYearId },
      select: { code: true },
    });
    const existingCodes = new Set(existingTarget.map((c) => c.code));

    const toCreate = sourceClasses
      .filter((c) => !existingCodes.has(c.code))
      .map((c) => ({
        levelId: c.levelId,
        academicYearId: toAcademicYearId,
        name: c.name,
        code: c.code,
        capacity: c.capacity,
        isActive: true,
      }));

    if (toCreate.length > 0) {
      await this.prisma.class.createMany({ data: toCreate });
    }

    return {
      copied: toCreate.length,
      skipped: sourceClasses.length - toCreate.length,
      classes: toCreate,
    };
  }

  // ============================================================
  // PREVIEW - students of a class with promotion suggestions
  // ============================================================

  async preview(
    fromAcademicYearId: string,
    toAcademicYearId: string,
    classId: string,
  ) {
    const fromClass = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { level: true },
    });
    if (!fromClass) throw new NotFoundException('Kelas tidak ditemukan');
    if (fromClass.academicYearId !== fromAcademicYearId) {
      throw new BadRequestException('Kelas bukan bagian dari tahun ajaran asal');
    }

    const histories = await this.prisma.studentClassHistory.findMany({
      where: { classId, academicYearId: fromAcademicYearId, status: 'ACTIVE' },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            nisn: true,
            fullName: true,
            gender: true,
            status: true,
          },
        },
      },
      orderBy: { student: { fullName: 'asc' } },
    });

    const targetClasses = await this.prisma.class.findMany({
      where: { academicYearId: toAcademicYearId },
      include: { level: true },
      orderBy: [{ level: { displayOrder: 'asc' } }, { name: 'asc' }],
    });

    // Same-level class in the target year is used for REPEAT,
    // next-level class with the same name for PROMOTE.
    const sameLevelTargets = targetClasses.filter(
      (c) => c.levelId === fromClass.levelId,
    );
    const nextLevelOrder = fromClass.level.displayOrder + 1;
    const nextLevelTargets = targetClasses.filter(
      (c) => c.level.displayOrder === nextLevelOrder,
    );
    const sameNameInNextLevel = nextLevelTargets.find(
      (c) => c.name === fromClass.name,
    );
    const promoteSuggestion =
      sameNameInNextLevel?.id ?? nextLevelTargets[0]?.id ?? null;
    const repeatSuggestion = sameLevelTargets[0]?.id ?? null;

    const targetYear = await this.prisma.academicYear.findUnique({
      where: { id: toAcademicYearId },
    });

    return {
      fromClass: {
        id: fromClass.id,
        name: fromClass.name,
        level: { id: fromClass.level.id, name: fromClass.level.name },
      },
      targetYear: targetYear
        ? { id: targetYear.id, name: targetYear.name }
        : null,
      suggestions: {
        promote: promoteSuggestion,
        repeat: repeatSuggestion,
      },
      targetClasses: targetClasses.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        level: { id: c.level.id, name: c.level.name },
        displayOrder: c.level.displayOrder,
      })),
      students: histories.map((h) => ({
        historyId: h.id,
        student: h.student,
      })),
    };
  }

  // ============================================================
  // EXECUTE - promote / repeat / graduate in one transaction
  // ============================================================

  async execute(
    fromAcademicYearId: string,
    toAcademicYearId: string,
    items: PromotionItem[],
    userId?: string,
  ) {
    if (fromAcademicYearId === toAcademicYearId) {
      throw new BadRequestException(
        'Tahun ajaran asal dan tujuan tidak boleh sama',
      );
    }
    if (!items || items.length === 0) {
      throw new BadRequestException('Tidak ada santri yang diproses');
    }

    const [fromYear, toYear] = await Promise.all([
      this.prisma.academicYear.findUnique({ where: { id: fromAcademicYearId } }),
      this.prisma.academicYear.findUnique({ where: { id: toAcademicYearId } }),
    ]);
    if (!fromYear) throw new NotFoundException('Tahun ajaran asal tidak ditemukan');
    if (!toYear) throw new NotFoundException('Tahun ajaran tujuan tidak ditemukan');

    // Validate target classes up front
    const targetClassIds = items
      .filter((i) => i.targetClassId)
      .map((i) => i.targetClassId!);
    const targetClasses =
      targetClassIds.length > 0
        ? await this.prisma.class.findMany({
            where: { id: { in: targetClassIds } },
            select: { id: true, academicYearId: true },
          })
        : [];
    const targetClassMap = new Map(targetClasses.map((c) => [c.id, c]));

    // Validate source histories
    const studentIds = items.map((i) => i.studentId);
    const histories = await this.prisma.studentClassHistory.findMany({
      where: {
        studentId: { in: studentIds },
        academicYearId: fromAcademicYearId,
        status: 'ACTIVE',
      },
    });
    const historyMap = new Map(histories.map((h) => [h.studentId, h]));

    for (const item of items) {
      const history = historyMap.get(item.studentId);
      if (!history) {
        throw new BadRequestException(
          `Santri ${item.studentId} tidak memiliki riwayat kelas aktif pada tahun ajaran asal`,
        );
      }
      if (item.action === 'PROMOTE' || item.action === 'REPEAT') {
        const targetClass = item.targetClassId
          ? targetClassMap.get(item.targetClassId)
          : undefined;
        if (!item.targetClassId || !targetClass) {
          throw new BadRequestException(
            'Kelas tujuan wajib dipilih untuk aksi naik kelas atau tinggal kelas',
          );
        }
        if (targetClass.academicYearId !== toAcademicYearId) {
          throw new BadRequestException(
            'Kelas tujuan bukan bagian dari tahun ajaran tujuan',
          );
        }
      }
    }

    const now = new Date();
    const operations: any[] = [];

    for (const item of items) {
      const history = historyMap.get(item.studentId)!;

      if (item.action === 'GRADUATE') {
        operations.push(
          this.prisma.studentClassHistory.update({
            where: { id: history.id },
            data: { endDate: now, status: 'GRADUATED' },
          }),
          this.prisma.student.update({
            where: { id: item.studentId },
            data: { status: 'GRADUATED' },
          }),
          this.prisma.studentStatusHistory.create({
            data: {
              studentId: item.studentId,
              status: 'GRADUATED',
              reason: `Lulus pada proses kenaikan ${fromYear.name}`,
            },
          }),
        );
      } else {
        const oldStatus = item.action === 'PROMOTE' ? 'PROMOTED' : 'REPEATED';
        operations.push(
          this.prisma.studentClassHistory.update({
            where: { id: history.id },
            data: { endDate: now, status: oldStatus },
          }),
          this.prisma.studentClassHistory.create({
            data: {
              studentId: item.studentId,
              classId: item.targetClassId!,
              academicYearId: toAcademicYearId,
              startDate: now,
              status: 'ACTIVE',
              notes:
                item.action === 'PROMOTE'
                  ? `Naik dari kelas pada ${fromYear.name}`
                  : `Mengulang dari ${fromYear.name}`,
            },
          }),
        );
      }
    }

    operations.push(
      this.prisma.activityLog.create({
        data: {
          userId: userId ?? null,
          action: 'EXECUTE',
          module: 'promotion',
          description: `Kenaikan kelas ${fromYear.name} -> ${toYear.name}: ${
            items.filter((i) => i.action === 'PROMOTE').length
          } naik, ${items.filter((i) => i.action === 'REPEAT').length} tinggal, ${
            items.filter((i) => i.action === 'GRADUATE').length
          } lulus`,
        },
      }),
    );

    await this.prisma.$transaction(operations);

    return {
      processed: items.length,
      promoted: items.filter((i) => i.action === 'PROMOTE').length,
      repeated: items.filter((i) => i.action === 'REPEAT').length,
      graduated: items.filter((i) => i.action === 'GRADUATE').length,
    };
  }
}
