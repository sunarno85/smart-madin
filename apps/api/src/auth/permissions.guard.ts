import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { AUTHENTICATED_ONLY_KEY } from '../common/decorators/authenticated.decorator';
import { PERMISSIONS_KEY } from '../common/decorators/require-permissions.decorator';

/**
 * Guard global yang menegakkan RBAC berbasis permission (`module.action`).
 *
 * - Endpoint @Public() dilewati.
 * - Endpoint @AuthenticatedOnly() cukup login.
 * - Endpoint lain WAJIB punya @RequirePermissions(...), jika tidak -> 403.
 * - Data pengguna, role, dan permission dibaca ulang dari database setiap
 *   request sehingga perubahan role/permission langsung berlaku dan akun
 *   yang dinonaktifkan langsung kehilangan akses.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.sub) {
      throw new UnauthorizedException('Silakan login terlebih dahulu');
    }

    const account = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        isActive: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
                permissions: {
                  select: {
                    permission: { select: { module: true, action: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!account || !account.isActive) {
      throw new UnauthorizedException('Akun tidak aktif atau tidak ditemukan');
    }

    const roles = account.roles.map((userRole) => userRole.role.name);
    const permissions = new Set(
      account.roles.flatMap((userRole) =>
        userRole.role.permissions.map(
          (rolePermission) =>
            `${rolePermission.permission.module}.${rolePermission.permission.action}`,
        ),
      ),
    );

    // Segarkan data akses pada request agar bisa dipakai controller/service.
    request.user = { ...user, roles, permissions: [...permissions] };

    if (roles.includes('SUPER_ADMIN')) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      targets,
    );

    if (!required || required.length === 0) {
      if (
        this.reflector.getAllAndOverride<boolean>(
          AUTHENTICATED_ONLY_KEY,
          targets,
        )
      ) {
        return true;
      }

      throw new ForbiddenException(
        'Endpoint ini belum memiliki definisi izin akses',
      );
    }

    const missing = required.filter(
      (permission) => !permissions.has(permission),
    );
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Anda tidak memiliki izin untuk aksi ini (${missing.join(', ')})`,
      );
    }

    return true;
  }
}
