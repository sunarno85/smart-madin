import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(levelId?: string) {
    return this.prisma.subject.findMany({
      where: {
        isActive: true,
        ...(levelId && { levelId }),
      },
      include: { level: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: { level: true },
    });
    if (!subject) throw new NotFoundException('Mata pelajaran tidak ditemukan');
    return subject;
  }

  async create(dto: CreateSubjectDto) {
    // Check duplicate code
    const existing = await this.prisma.subject.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Kode "${dto.code}" sudah digunakan`);
    }

    return this.prisma.subject.create({
      data: {
        code: dto.code,
        name: dto.name,
        nameArabic: dto.nameArabic,
        description: dto.description,
        levelId: dto.levelId,
      },
      include: { level: true },
    });
  }

  async update(id: string, dto: UpdateSubjectDto) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException('Mata pelajaran tidak ditemukan');

    if (dto.code && dto.code !== subject.code) {
      const existing = await this.prisma.subject.findUnique({
        where: { code: dto.code },
      });
      if (existing) {
        throw new ConflictException(`Kode "${dto.code}" sudah digunakan`);
      }
    }

    return this.prisma.subject.update({
      where: { id },
      data: dto,
      include: { level: true },
    });
  }

  async delete(id: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException('Mata pelajaran tidak ditemukan');

    return this.prisma.subject.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
