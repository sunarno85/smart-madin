import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    levelId?: string;
    classId?: string;
    gender?: string;
    academicYearId?: string;
  }) {
    const {
      page = 1,
      pageSize = 20,
      search,
      status,
      levelId,
      classId,
      gender,
      academicYearId,
    } = params;

    const where: Prisma.StudentWhereInput = {
      deletedAt: null,
    };

    if (status) where.status = status as any;
    if (gender) where.gender = gender as any;

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { nik: { contains: search } },
        { nisn: { contains: search } },
        { studentNumber: { contains: search } },
      ];
    }

    if (classId) {
      where.classHistories = {
        some: {
          classId,
          status: 'ACTIVE',
          ...(academicYearId && { academicYearId }),
        },
      };
    } else if (levelId && academicYearId) {
      where.classHistories = {
        some: {
          class: { levelId },
          academicYearId,
          status: 'ACTIVE',
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          classHistories: {
            where: { status: 'ACTIVE' },
            include: { class: { include: { level: true } }, academicYear: true },
            take: 1,
            orderBy: { startDate: 'desc' },
          },
          _count: { select: { parents: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id, deletedAt: null },
      include: {
        parents: true,
        classHistories: {
          include: { class: { include: { level: true } }, academicYear: true },
          orderBy: { startDate: 'desc' },
        },
        statusHistories: { orderBy: { effectiveAt: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!student) throw new NotFoundException('Santri tidak ditemukan');
    return student;
  }

  async create(dto: CreateStudentDto) {
    // Check duplicates (only among active, non-deleted students)
    await this.checkDuplicates(dto);

    // Generate student number if not provided
    let studentNumber = dto.studentNumber;
    if (!studentNumber) {
      studentNumber = await this.generateStudentNumber();
    }

    const student = await this.prisma.student.create({
      data: {
        studentNumber,
        nik: dto.nik || null,
        nisn: dto.nisn || null,
        fullName: dto.fullName,
        gender: dto.gender,
        birthPlace: dto.birthPlace,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        address: dto.address,
        village: dto.village,
        district: dto.district,
        regency: dto.regency,
        province: dto.province,
        postalCode: dto.postalCode,
        kkNumber: dto.kkNumber,
        guardianName: dto.guardianName,
        guardianPhone: dto.guardianPhone,
        status: (dto.status || 'ACTIVE') as any,
        notes: dto.notes,
      },
    });

    // Create parent records if provided
    if (dto.fatherName || dto.motherName) {
      if (dto.fatherName) {
        await this.prisma.studentParent.create({
          data: {
            studentId: student.id,
            relationship: 'FATHER',
            name: dto.fatherName,
            nik: dto.fatherNik,
            phone: dto.fatherPhone,
            occupation: dto.fatherOccupation,
            isPrimary: true,
          },
        });
      }
      if (dto.motherName) {
        await this.prisma.studentParent.create({
          data: {
            studentId: student.id,
            relationship: 'MOTHER',
            name: dto.motherName,
            nik: dto.motherNik,
            phone: dto.motherPhone,
            occupation: dto.motherOccupation,
            isPrimary: !dto.fatherName,
          },
        });
      }
    }

    return this.findOne(student.id);
  }

  async update(id: string, dto: UpdateStudentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id, deletedAt: null },
    });
    if (!student) throw new NotFoundException('Santri tidak ditemukan');

    // Check duplicates (excluding self)
    if (dto.nik || dto.nisn || dto.studentNumber) {
      await this.checkDuplicates(
        {
          nik: dto.nik || student.nik,
          nisn: dto.nisn || student.nisn,
          studentNumber: dto.studentNumber || student.studentNumber,
          fullName: dto.fullName || student.fullName,
        } as any,
        id,
      );
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        ...(dto.nik !== undefined && { nik: dto.nik }),
        ...(dto.nisn !== undefined && { nisn: dto.nisn }),
        ...(dto.studentNumber && { studentNumber: dto.studentNumber }),
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.gender && { gender: dto.gender }),
        ...(dto.birthPlace !== undefined && { birthPlace: dto.birthPlace }),
        ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.village !== undefined && { village: dto.village }),
        ...(dto.district !== undefined && { district: dto.district }),
        ...(dto.regency !== undefined && { regency: dto.regency }),
        ...(dto.province !== undefined && { province: dto.province }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.kkNumber !== undefined && { kkNumber: dto.kkNumber }),
        ...(dto.guardianName !== undefined && { guardianName: dto.guardianName }),
        ...(dto.guardianPhone !== undefined && { guardianPhone: dto.guardianPhone }),
        ...(dto.status && { status: dto.status as any }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        classHistories: {
          where: { status: 'ACTIVE' },
          include: { class: { include: { level: true } }, academicYear: true },
          take: 1,
        },
      },
    });
  }

  async softDelete(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id, deletedAt: null },
    });
    if (!student) throw new NotFoundException('Santri tidak ditemukan');

    return this.prisma.student.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });
  }

  async restore(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    });
    if (!student) throw new NotFoundException('Santri tidak ditemukan');
    if (!student.deletedAt) {
      throw new BadRequestException('Santri tidak dalam status dihapus');
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        deletedAt: null,
        status: 'ACTIVE',
      },
    });
  }

  async assignClass(
    studentId: string,
    classId: string,
    academicYearId: string,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
    });
    if (!student) throw new NotFoundException('Santri tidak ditemukan');

    // Check if already assigned in this year
    const existing = await this.prisma.studentClassHistory.findFirst({
      where: {
        studentId,
        academicYearId,
        status: 'ACTIVE',
      },
    });

    if (existing) {
      // End current assignment
      await this.prisma.studentClassHistory.update({
        where: { id: existing.id },
        data: { endDate: new Date(), status: 'INACTIVE' },
      });
    }

    return this.prisma.studentClassHistory.create({
      data: {
        studentId,
        classId,
        academicYearId,
        startDate: new Date(),
        status: 'ACTIVE',
      },
      include: { class: { include: { level: true } }, academicYear: true },
    });
  }

  async updatePhoto(id: string, filename: string) {
    const student = await this.prisma.student.findUnique({ where: { id, deletedAt: null } });
    if (!student) throw new NotFoundException('Santri tidak ditemukan');
    return this.prisma.student.update({
      where: { id },
      data: { photo: filename },
      select: { id: true, photo: true },
    });
  }

  async getStats() {
    const [totalActive, totalInactive, maleCount, femaleCount] =
      await Promise.all([
        this.prisma.student.count({
          where: { status: 'ACTIVE', deletedAt: null },
        }),
        this.prisma.student.count({
          where: {
            status: { not: 'ACTIVE' },
            deletedAt: null,
          },
        }),
        this.prisma.student.count({
          where: { gender: 'MALE', status: 'ACTIVE', deletedAt: null },
        }),
        this.prisma.student.count({
          where: { gender: 'FEMALE', status: 'ACTIVE', deletedAt: null },
        }),
      ]);

    return {
      totalActive,
      totalInactive,
      maleCount,
      femaleCount,
      total: totalActive + totalInactive,
    };
  }

  private async checkDuplicates(dto: CreateStudentDto, excludeId?: string) {
    const conditions: Prisma.StudentWhereInput[] = [];

    if (dto.nik) {
      conditions.push({
        nik: dto.nik,
        deletedAt: null,
        ...(excludeId && { NOT: { id: excludeId } }),
      });
    }

    if (dto.nisn) {
      conditions.push({
        nisn: dto.nisn,
        deletedAt: null,
        ...(excludeId && { NOT: { id: excludeId } }),
      });
    }

    if (dto.studentNumber) {
      conditions.push({
        studentNumber: dto.studentNumber,
        deletedAt: null,
        ...(excludeId && { NOT: { id: excludeId } }),
      });
    }

    if (conditions.length === 0) return;

    for (const condition of conditions) {
      const existing = await this.prisma.student.findFirst({
        where: condition,
      });
      if (existing) {
        const field = existing.nik === dto.nik ? 'NIK' :
          existing.nisn === dto.nisn ? 'NISN' : 'Nomor Induk';
        throw new ConflictException(
          `${field} "${dto.nik || dto.nisn || dto.studentNumber}" sudah terdaftar`,
        );
      }
    }
  }

  private async generateStudentNumber(): Promise<string> {
    const count = await this.prisma.student.count({
      where: { deletedAt: null },
    });
    return `STU${String(count + 1).padStart(5, '0')}`;
  }
}
