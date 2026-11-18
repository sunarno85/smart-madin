import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        roles: {
          select: {
            role: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        avatar: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        employeeId: true,
        roles: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return user;
  }

  async create(data: {
    username: string;
    email: string;
    password: string;
    fullName?: string;
    roleIds?: string[];
  }) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: data.username },
          { email: data.email },
        ],
      },
    });
    if (existingUser) {
      const field = existingUser.username === data.username ? 'Username' : 'Email';
      throw new ConflictException(`${field} "${data.username === existingUser.username ? data.username : data.email}" sudah digunakan`);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        roles: data.roleIds && data.roleIds.length > 0
          ? { create: data.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        isActive: true,
      },
    });

    return user;
  }

  async update(id: string, data: {
    email?: string;
    fullName?: string;
    isActive?: boolean;
    roleIds?: string[];
  }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    if (data.email && data.email !== user.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: data.email, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Email "${data.email}" sudah digunakan`);
      }
    }

    if (data.roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      if (data.roleIds.length > 0) {
        await this.prisma.userRole.createMany({
          data: data.roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        isActive: true,
      },
    });
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    return this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        failedAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        username: true,
      },
    });
  }

  async toggleActive(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        username: true,
        isActive: true,
      },
    });
  }
}
