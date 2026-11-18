import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';

@Injectable()
export class LevelsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.level.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { classes: true, subjects: true },
    });
  }

  async findOne(id: string) {
    const level = await this.prisma.level.findUnique({
      where: { id },
      include: { classes: true, subjects: true },
    });
    if (!level) throw new NotFoundException('Jenjang tidak ditemukan');
    return level;
  }

  async create(dto: CreateLevelDto) {
    return this.prisma.level.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateLevelDto) {
    const level = await this.prisma.level.findUnique({ where: { id } });
    if (!level) throw new NotFoundException('Jenjang tidak ditemukan');

    return this.prisma.level.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    const level = await this.prisma.level.findUnique({
      where: { id },
      include: { classes: true, subjects: true },
    });
    if (!level) throw new NotFoundException('Jenjang tidak ditemukan');
    if (level.classes.length > 0) {
      throw new BadRequestException('Tidak dapat menghapus jenjang yang memiliki kelas');
    }
    return this.prisma.level.delete({ where: { id } });
  }
}
