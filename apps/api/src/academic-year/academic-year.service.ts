import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';

@Injectable()
export class AcademicYearService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async findActive() {
    const active = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
    });
    return active;
  }

  async create(dto: CreateAcademicYearDto) {
    // Only one active year allowed
    if (dto.isActive) {
      await this.deactivateAll();
    }

    return this.prisma.academicYear.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isActive: dto.isActive ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateAcademicYearDto) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
    });
    if (!year) {
      throw new NotFoundException('Tahun ajaran tidak ditemukan');
    }

    // If activating, deactivate others
    if (dto.isActive && !year.isActive) {
      await this.deactivateAll();
    }

    return this.prisma.academicYear.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.activeSemester && { activeSemester: dto.activeSemester }),
        ...(dto.ppdbOpen !== undefined && { ppdbOpen: dto.ppdbOpen }),
      },
    });
  }

  async delete(id: string) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
      include: { classes: true },
    });

    if (!year) {
      throw new NotFoundException('Tahun ajaran tidak ditemukan');
    }

    if (year.isActive) {
      throw new BadRequestException('Tidak dapat menghapus tahun ajaran aktif');
    }

    if (year.classes.length > 0) {
      throw new BadRequestException(
        'Tidak dapat menghapus tahun ajaran yang memiliki kelas',
      );
    }

    return this.prisma.academicYear.delete({ where: { id } });
  }

  async activate(id: string) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
    });

    if (!year) {
      throw new NotFoundException('Tahun ajaran tidak ditemukan');
    }

    await this.deactivateAll();

    return this.prisma.academicYear.update({
      where: { id },
      data: { isActive: true },
    });
  }

  private async deactivateAll() {
    await this.prisma.academicYear.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
  }
}
