import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const VALID_STATUSES = ['BARU', 'VERIFIED', 'ACCEPTED', 'WAITLISTED', 'REJECTED', 'ENROLLED'] as const;
type PpdbStatusValue = (typeof VALID_STATUSES)[number];

@Injectable()
export class PpdbService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // PUBLIC - open years, register, check status
  // ============================================================

  async findOpenYears() {
    const years = await this.prisma.academicYear.findMany({
      where: { ppdbOpen: true },
      select: { id: true, name: true, startDate: true, endDate: true },
      orderBy: { startDate: 'desc' },
    });
    return years;
  }

  async register(data: {
    targetYearId: string;
    fullName: string;
    gender: string;
    nik?: string;
    nisn?: string;
    birthPlace?: string;
    birthDate?: string;
    address?: string;
    previousSchool?: string;
    fatherName?: string;
    motherName?: string;
    parentPhone?: string;
  }) {
    if (!data.fullName || !data.fullName.trim()) {
      throw new BadRequestException('Nama lengkap wajib diisi');
    }
    if (data.gender !== 'MALE' && data.gender !== 'FEMALE') {
      throw new BadRequestException('Jenis kelamin tidak valid');
    }

    const year = await this.prisma.academicYear.findUnique({
      where: { id: data.targetYearId },
    });
    if (!year) throw new NotFoundException('Tahun ajaran tujuan tidak ditemukan');
    if (!year.ppdbOpen) {
      throw new BadRequestException('PPDB untuk tahun ajaran ini belum dibuka');
    }

    const registrationNumber = await this.generateRegistrationNumber(year.name);

    return this.prisma.ppdbRegistration.create({
      data: {
        registrationNumber,
        targetYearId: data.targetYearId,
        fullName: data.fullName.trim(),
        gender: data.gender,
        nik: data.nik?.trim() || null,
        nisn: data.nisn?.trim() || null,
        birthPlace: data.birthPlace?.trim() || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        address: data.address?.trim() || null,
        previousSchool: data.previousSchool?.trim() || null,
        fatherName: data.fatherName?.trim() || null,
        motherName: data.motherName?.trim() || null,
        parentPhone: data.parentPhone?.trim() || null,
      },
      select: {
        id: true,
        registrationNumber: true,
        fullName: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async publicCheckStatus(registrationNumber: string) {
    const reg = await this.prisma.ppdbRegistration.findUnique({
      where: { registrationNumber: registrationNumber.trim().toUpperCase() },
      select: {
        registrationNumber: true,
        fullName: true,
        status: true,
        notes: true,
        createdAt: true,
        targetYear: { select: { name: true } },
      },
    });
    if (!reg) throw new NotFoundException('Nomor pendaftaran tidak ditemukan');
    return reg;
  }

  // ============================================================
  // ADMIN
  // ============================================================

  async findRegistrations(params: {
    targetYearId?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { targetYearId, status, search, page = 1, pageSize = 20 } = params;

    const where: Prisma.PpdbRegistrationWhereInput = {};
    if (targetYearId) where.targetYearId = targetYearId;
    if (status) where.status = status as any;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { registrationNumber: { contains: search, mode: 'insensitive' } },
        { parentPhone: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.ppdbRegistration.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          targetYear: { select: { id: true, name: true } },
          student: { select: { id: true, studentNumber: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ppdbRegistration.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOneRegistration(id: string) {
    const reg = await this.prisma.ppdbRegistration.findUnique({
      where: { id },
      include: {
        targetYear: { select: { id: true, name: true } },
        student: { select: { id: true, studentNumber: true, fullName: true } },
      },
    });
    if (!reg) throw new NotFoundException('Pendaftaran tidak ditemukan');
    return reg;
  }

  async getStats(targetYearId?: string) {
    const where: Prisma.PpdbRegistrationWhereInput = {};
    if (targetYearId) where.targetYearId = targetYearId;

    const grouped = await this.prisma.ppdbRegistration.groupBy({
      by: ['status'],
      _count: true,
      where,
    });

    const stats: Record<string, number> = {
      BARU: 0, VERIFIED: 0, ACCEPTED: 0, WAITLISTED: 0, REJECTED: 0, ENROLLED: 0,
    };
    for (const g of grouped) stats[g.status] = g._count;

    return {
      total: Object.values(stats).reduce((a, b) => a + b, 0),
      ...stats,
    };
  }

  async updateStatus(id: string, status: string, notes?: string, userId?: string) {
    if (!VALID_STATUSES.includes(status as PpdbStatusValue)) {
      throw new BadRequestException('Status tidak valid');
    }
    if (status === 'ENROLLED') {
      throw new BadRequestException(
        'Gunakan endpoint enroll untuk mengubah pendaftar menjadi santri',
      );
    }

    const reg = await this.prisma.ppdbRegistration.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Pendaftaran tidak ditemukan');
    if (reg.status === 'ENROLLED') {
      throw new ConflictException('Pendaftar sudah menjadi santri');
    }

    return this.prisma.ppdbRegistration.update({
      where: { id },
      data: {
        status: status as any,
        notes: notes !== undefined ? notes : reg.notes,
        reviewedBy: userId ?? null,
        reviewedAt: new Date(),
      },
      include: {
        targetYear: { select: { id: true, name: true } },
        student: { select: { id: true, studentNumber: true, fullName: true } },
      },
    });
  }

  async enroll(id: string, userId?: string) {
    const reg = await this.prisma.ppdbRegistration.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Pendaftaran tidak ditemukan');
    if (reg.status === 'ENROLLED') {
      throw new ConflictException('Pendaftar sudah menjadi santri');
    }
    if (reg.status === 'REJECTED') {
      throw new BadRequestException('Pendaftar yang ditolak tidak bisa didaftarkan menjadi santri');
    }

    const studentNumber = await this.generateStudentNumber();

    const result = await this.prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          studentNumber,
          nik: reg.nik,
          nisn: reg.nisn,
          fullName: reg.fullName,
          gender: reg.gender,
          birthPlace: reg.birthPlace,
          birthDate: reg.birthDate,
          address: reg.address,
          guardianName: reg.fatherName ?? reg.motherName ?? null,
          guardianPhone: reg.parentPhone ?? null,
          status: 'ACTIVE',
          notes: `Hasil PPDB ${reg.registrationNumber}`,
        },
      });

      const parents: {
        relationship: 'FATHER' | 'MOTHER';
        name: string;
        phone?: string | null;
        isPrimary: boolean;
      }[] = [];
      if (reg.fatherName) {
        parents.push({ relationship: 'FATHER', name: reg.fatherName, phone: reg.parentPhone, isPrimary: true });
      }
      if (reg.motherName) {
        parents.push({ relationship: 'MOTHER', name: reg.motherName, phone: !reg.fatherName ? reg.parentPhone : null, isPrimary: !reg.fatherName });
      }
      if (parents.length > 0) {
        await tx.studentParent.createMany({
          data: parents.map((p) => ({
            studentId: student.id,
            relationship: p.relationship,
            name: p.name,
            phone: p.phone ?? null,
            isPrimary: p.isPrimary,
          })),
        });
      }

      const updated = await tx.ppdbRegistration.update({
        where: { id },
        data: {
          status: 'ENROLLED',
          studentId: student.id,
          reviewedBy: userId ?? null,
          reviewedAt: new Date(),
        },
        include: {
          student: { select: { id: true, studentNumber: true, fullName: true } },
        },
      });

      await tx.activityLog.create({
        data: {
          userId: userId ?? null,
          action: 'ENROLL',
          module: 'ppdb',
          entity: 'PpdbRegistration',
          entityId: id,
          description: `Pendaftar ${reg.fullName} (${reg.registrationNumber}) menjadi santri ${student.studentNumber}`,
        },
      });

      return updated;
    });

    return result;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private async generateRegistrationNumber(yearName: string): Promise<string> {
    const startYear = yearName.split('/')[0] || yearName;
    const prefix = `PPDB-${startYear}-`;
    const count = await this.prisma.ppdbRegistration.count({
      where: { registrationNumber: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private async generateStudentNumber(): Promise<string> {
    // count-based base + collision retry (numbers can be freed by deletes)
    for (let attempt = 0; attempt < 20; attempt++) {
      const count = await this.prisma.student.count({ where: { deletedAt: null } });
      const candidate = `STU${String(count + 1 + attempt).padStart(5, '0')}`;
      const exists = await this.prisma.student.findUnique({
        where: { studentNumber: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    throw new ConflictException('Gagal menghasilkan nomor induk unik');
  }
}
