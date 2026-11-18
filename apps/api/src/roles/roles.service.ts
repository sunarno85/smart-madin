import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
        users: {
          include: {
            user: {
              select: { id: true, username: true, fullName: true, email: true },
            },
          },
        },
      },
    });
    if (!role) throw new NotFoundException('Role tidak ditemukan');
    return role;
  }

  async create(data: { name: string; description?: string }) {
    const existing = await this.prisma.role.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new ConflictException(`Role "${data.name}" sudah ada`);
    }

    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        isSystem: false,
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string }) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role tidak ditemukan');
    if (role.isSystem && data.name && data.name !== role.name) {
      throw new BadRequestException('Tidak dapat mengubah nama role system');
    }

    if (data.name) {
      const existing = await this.prisma.role.findFirst({
        where: { name: data.name, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Role "${data.name}" sudah ada`);
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });
  }

  async delete(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Role tidak ditemukan');
    if (role.isSystem) {
      throw new BadRequestException('Tidak dapat menghapus role system');
    }
    if ((role._count as any).users > 0) {
      throw new BadRequestException('Tidak dapat menghapus role yang masih digunakan oleh user');
    }

    return this.prisma.role.delete({ where: { id } });
  }

  // ============================================================
  // Permissions
  // ============================================================

  async findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  async getPermissionTree() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    const tree: Record<string, string[]> = {};
    for (const p of permissions) {
      if (!tree[p.module]) tree[p.module] = [];
      tree[p.module].push(p.action);
    }
    return tree;
  }

  async updatePermissions(roleId: string, permissionIds: string[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role tidak ditemukan');

    // Delete existing
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Create new
    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      });
    }

    return this.findOne(roleId);
  }

  async setPermissions(roleId: string, permissions: { module: string; actions: string[] }[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role tidak ditemukan');

    // Get matching permission IDs
    const allPerms = await this.prisma.permission.findMany();
    const permIds: string[] = [];

    for (const p of permissions) {
      for (const action of p.actions) {
        const found = allPerms.find((ap) => ap.module === p.module && ap.action === action);
        if (found) permIds.push(found.id);
      }
    }

    // Replace all
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    if (permIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permIds.map((permissionId) => ({ roleId, permissionId })),
      });
    }

    return this.findOne(roleId);
  }

  // Default permissions per role
  private getDefaultPermissions(roleName: string): { module: string; actions: string[] }[] {
    const defaults: Record<string, { module: string; actions: string[] }[]> = {
      SUPER_ADMIN: [
        { module: 'students', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'employees', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'classes', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'subjects', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'schedules', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'reports', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'settings', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'users', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'imports', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'announcements', actions: ['read', 'create', 'update', 'delete', 'manage'] },
      ],
      ADMIN: [
        { module: 'students', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'employees', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'classes', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'subjects', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'schedules', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'reports', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'settings', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'users', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'imports', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'announcements', actions: ['read', 'create', 'update', 'delete', 'manage'] },
      ],
      HEADMASTER: [
        { module: 'students', actions: ['read', 'create', 'update', 'manage'] },
        { module: 'employees', actions: ['read', 'create', 'update', 'manage'] },
        { module: 'classes', actions: ['read', 'create', 'update', 'manage'] },
        { module: 'subjects', actions: ['read', 'create', 'update', 'manage'] },
        { module: 'schedules', actions: ['read', 'create', 'update', 'manage'] },
        { module: 'reports', actions: ['read', 'manage'] },
        { module: 'settings', actions: ['read'] },
        { module: 'announcements', actions: ['read', 'create', 'update', 'delete'] },
      ],
      HOMEROOM_TEACHER: [
        { module: 'students', actions: ['read', 'update'] },
        { module: 'classes', actions: ['read'] },
        { module: 'schedules', actions: ['read'] },
        { module: 'reports', actions: ['read'] },
        { module: 'announcements', actions: ['read'] },
      ],
      TEACHER: [
        { module: 'students', actions: ['read'] },
        { module: 'schedules', actions: ['read'] },
        { module: 'reports', actions: ['read'] },
        { module: 'announcements', actions: ['read'] },
      ],
      OPERATOR: [
        { module: 'students', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'employees', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'classes', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'subjects', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'schedules', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { module: 'reports', actions: ['read', 'manage'] },
        { module: 'imports', actions: ['read', 'create', 'update', 'delete', 'manage'] },
      ],
    };
    return defaults[roleName] || defaults.TEACHER;
  }

  async resetPermissionsToDefault(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role tidak ditemukan');

    const defaultPerms = this.getDefaultPermissions(role.name);
    return this.setPermissions(roleId, defaultPerms);
  }
}
