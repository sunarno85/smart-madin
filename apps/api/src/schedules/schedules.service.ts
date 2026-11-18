import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    academicYearId?: string;
    classId?: string;
    teacherId?: string;
    dayOfWeek?: number;
    levelId?: string;
  }) {
    const { academicYearId, classId, teacherId, dayOfWeek, levelId } = params;

    const where: any = {};
    if (academicYearId) where.academicYearId = academicYearId;
    if (classId) where.classId = classId;
    if (teacherId) where.teacherId = teacherId;
    if (dayOfWeek !== undefined) where.dayOfWeek = dayOfWeek;

    if (levelId) {
      where.class = { levelId };
    }

    return this.prisma.schedule.findMany({
      where,
      include: {
        class: { include: { level: true } },
        subject: true,
        teacher: true,
        academicYear: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        class: { include: { level: true } },
        subject: true,
        teacher: true,
        academicYear: true,
      },
    });
    if (!schedule) throw new NotFoundException('Jadwal tidak ditemukan');
    return schedule;
  }

  async create(dto: CreateScheduleDto) {
    await this.checkConflict(dto);

    return this.prisma.schedule.create({
      data: {
        academicYearId: dto.academicYearId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        teacherId: dto.teacherId,
        dayOfWeek: dto.dayOfWeek,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        room: dto.room,
        notes: dto.notes,
      },
      include: {
        class: { include: { level: true } },
        subject: true,
        teacher: true,
      },
    });
  }

  async update(id: string, dto: UpdateScheduleDto) {
    const schedule = await this.prisma.schedule.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundException('Jadwal tidak ditemukan');

    const data = {
      ...dto,
      startTime: dto.startTime ? new Date(dto.startTime) : schedule.startTime,
      endTime: dto.endTime ? new Date(dto.endTime) : schedule.endTime,
    };

    await this.checkConflict(
      {
        ...data,
        startTime: data.startTime.toISOString(),
        endTime: data.endTime.toISOString(),
      } as any,
      id,
    );

    return this.prisma.schedule.update({
      where: { id },
      data,
      include: {
        class: { include: { level: true } },
        subject: true,
        teacher: true,
      },
    });
  }

  async delete(id: string) {
    const schedule = await this.prisma.schedule.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundException('Jadwal tidak ditemukan');
    return this.prisma.schedule.delete({ where: { id } });
  }

  async getWeeklySchedule(classId: string, academicYearId: string) {
    return this.prisma.schedule.findMany({
      where: { classId, academicYearId },
      include: {
        subject: true,
        teacher: true,
        class: { include: { level: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  private async checkConflict(dto: CreateScheduleDto, excludeId?: string) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('Jam selesai harus setelah jam mulai');
    }

    // Check teacher conflict
    const teacherConflict = await this.prisma.schedule.findFirst({
      where: {
        teacherId: dto.teacherId,
        academicYearId: dto.academicYearId,
        dayOfWeek: dto.dayOfWeek,
        id: excludeId ? { not: excludeId } : undefined,
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
    });

    if (teacherConflict) {
      const cls = await this.prisma.class.findUnique({
        where: { id: teacherConflict.classId },
      });
      throw new BadRequestException(
        `Guru sudah mengajar di kelas ${cls?.name} pada waktu tersebut`,
      );
    }

    // Check class conflict
    const classConflict = await this.prisma.schedule.findFirst({
      where: {
        classId: dto.classId,
        academicYearId: dto.academicYearId,
        dayOfWeek: dto.dayOfWeek,
        id: excludeId ? { not: excludeId } : undefined,
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
    });

    if (classConflict) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: classConflict.subjectId },
      });
      throw new BadRequestException(
        `Kelas sudah memiliki jadwal ${subject?.name} pada waktu tersebut`,
      );
    }
  }
}
