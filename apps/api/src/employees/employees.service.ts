import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    employeeType?: string;
    activityStatus?: string;
  }) {
    const {
      page = 1,
      pageSize = 20,
      search,
      employeeType,
      activityStatus,
    } = params;

    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
    };

    if (employeeType) where.employeeType = employeeType as any;
    if (activityStatus) where.activityStatus = activityStatus as any;

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { nik: { contains: search } },
        { employeeNumber: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.employee.count({ where }),
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
    const employee = await this.prisma.employee.findUnique({
      where: { id, deletedAt: null },
      include: {
        teacherSubjects: {
          include: { subject: true, academicYear: true },
        },
        homeroomClasses: {
          include: { level: true, academicYear: true },
        },
      },
    });
    if (!employee) throw new NotFoundException('Pegawai tidak ditemukan');
    return employee;
  }

  async create(dto: CreateEmployeeDto) {
    await this.checkDuplicates(dto);

    const employeeNumber =
      dto.employeeNumber || (await this.generateEmployeeNumber());

    return this.prisma.employee.create({
      data: {
        employeeNumber,
        nik: dto.nik,
        fullName: dto.fullName,
        gender: dto.gender,
        birthPlace: dto.birthPlace,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        address: dto.address,
        motherName: dto.motherName,
        postalCode: dto.postalCode,
        employmentStatus: dto.employmentStatus,
        educationLevel: dto.educationLevel,
        subjectArea: dto.subjectArea,
        employeeType: dto.employeeType,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        activityStatus: (dto.activityStatus || 'ACTIVE') as any,
        phone: dto.phone,
        email: dto.email,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Pegawai tidak ditemukan');

    if (dto.nik || dto.employeeNumber) {
      await this.checkDuplicates(
        {
          nik: dto.nik || employee.nik,
          employeeNumber: dto.employeeNumber || employee.employeeNumber,
        } as any,
        id,
      );
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.nik !== undefined && { nik: dto.nik }),
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.gender && { gender: dto.gender }),
        ...(dto.birthPlace !== undefined && { birthPlace: dto.birthPlace }),
        ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.motherName !== undefined && { motherName: dto.motherName }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.employmentStatus !== undefined && {
          employmentStatus: dto.employmentStatus,
        }),
        ...(dto.educationLevel !== undefined && {
          educationLevel: dto.educationLevel,
        }),
        ...(dto.subjectArea !== undefined && { subjectArea: dto.subjectArea }),
        ...(dto.employeeType && { employeeType: dto.employeeType }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.activityStatus && { activityStatus: dto.activityStatus as any }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async softDelete(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Pegawai tidak ditemukan');

    return this.prisma.employee.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        activityStatus: 'INACTIVE',
      },
    });
  }

  async updatePhoto(id: string, filename: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id, deletedAt: null } });
    if (!employee) throw new NotFoundException('Pegawai tidak ditemukan');
    return this.prisma.employee.update({
      where: { id },
      data: { photo: filename },
      select: { id: true, photo: true },
    });
  }

  async getStats() {
    const [teachers, staff, activeCount] = await Promise.all([
      this.prisma.employee.count({
        where: { employeeType: 'TEACHER', deletedAt: null },
      }),
      this.prisma.employee.count({
        where: { employeeType: 'STAFF', deletedAt: null },
      }),
      this.prisma.employee.count({
        where: { activityStatus: 'ACTIVE', deletedAt: null },
      }),
    ]);

    return { teachers, staff, active: activeCount, total: teachers + staff };
  }

  private async checkDuplicates(dto: CreateEmployeeDto, excludeId?: string) {
    if (dto.nik) {
      const existing = await this.prisma.employee.findFirst({
        where: {
          nik: dto.nik,
          deletedAt: null,
          ...(excludeId && { NOT: { id: excludeId } }),
        },
      });
      if (existing) {
        throw new ConflictException(`NIK "${dto.nik}" sudah terdaftar`);
      }
    }

    if (dto.employeeNumber) {
      const existing = await this.prisma.employee.findFirst({
        where: {
          employeeNumber: dto.employeeNumber,
          deletedAt: null,
          ...(excludeId && { NOT: { id: excludeId } }),
        },
      });
      if (existing) {
        throw new ConflictException(
          `Nomor induk "${dto.employeeNumber}" sudah terdaftar`,
        );
      }
    }
  }

  private async generateEmployeeNumber(): Promise<string> {
    const count = await this.prisma.employee.count({
      where: { deletedAt: null },
    });
    return `EMP${String(count + 1).padStart(5, '0')}`;
  }
}
