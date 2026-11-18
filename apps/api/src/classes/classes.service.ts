import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async findAll(academicYearId?: string, levelId?: string) {
    const where: any = {};
    if (academicYearId) where.academicYearId = academicYearId;
    if (levelId) where.levelId = levelId;

    return this.prisma.class.findMany({
      where,
      include: {
        level: true,
        academicYear: true,
        homeroomTeacher: true,
        _count: {
          select: {
            studentClassHistories: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
      orderBy: [{ level: { displayOrder: 'asc' } }, { code: 'asc' }],
    });
  }

  async findOne(id: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      include: {
        level: true,
        academicYear: true,
        homeroomTeacher: true,
        _count: {
          select: {
            studentClassHistories: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });
    if (!cls) throw new NotFoundException('Kelas tidak ditemukan');
    return cls;
  }

  async create(dto: CreateClassDto) {
    // Check duplicate code within same academic year
    const existing = await this.prisma.class.findFirst({
      where: {
        academicYearId: dto.academicYearId,
        code: dto.code,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Kode kelas "${dto.code}" sudah ada di tahun ajaran ini`,
      );
    }

    return this.prisma.class.create({
      data: {
        levelId: dto.levelId,
        academicYearId: dto.academicYearId,
        name: dto.name,
        code: dto.code,
        capacity: dto.capacity ?? 40,
        homeroomTeacherId: dto.homeroomTeacherId,
      },
      include: { level: true, academicYear: true },
    });
  }

  async update(id: string, dto: UpdateClassDto) {
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException('Kelas tidak ditemukan');

    // Check duplicate code
    if (dto.code && dto.code !== cls.code) {
      const existing = await this.prisma.class.findFirst({
        where: {
          academicYearId: cls.academicYearId,
          code: dto.code,
          NOT: { id },
        },
      });
      if (existing) {
        throw new BadRequestException(
          `Kode kelas "${dto.code}" sudah ada di tahun ajaran ini`,
        );
      }
    }

    return this.prisma.class.update({
      where: { id },
      data: dto,
      include: { level: true, academicYear: true },
    });
  }

  async delete(id: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      include: {
        _count: { select: { studentClassHistories: true } },
      },
    });
    if (!cls) throw new NotFoundException('Kelas tidak ditemukan');
    if ((cls._count as any).studentClassHistories > 0) {
      throw new BadRequestException('Tidak dapat menghapus kelas yang memiliki riwayat santri');
    }
    return this.prisma.class.delete({ where: { id } });
  }
}
