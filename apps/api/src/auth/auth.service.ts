import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../config/env';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { email: username }],
        isActive: true,
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Username atau password salah');
    }

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Akun terkunci. Coba lagi dalam beberapa menit.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Increment failed attempts
      const failedAttempts = user.failedAttempts + 1;
      const lockedUntil =
        failedAttempts >= 5
          ? new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
          : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts, lockedUntil },
      });

      throw new UnauthorizedException('Username atau password salah');
    }

    // Reset failed attempts and update last login
    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission),
        ),
      ),
    ].map((p) => `${p.module}.${p.action}`);

    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: env.jwtRefreshSecret,
      expiresIn: env.jwtRefreshExpiration,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedAttempts: 0,
        lockedUntil: null,
        refreshToken,
      },
    });

    // Log login activity
    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        module: 'auth',
        description: `${user.username} logged in`,
      },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        roles,
        permissions,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: env.jwtRefreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } },
                },
              },
            },
          },
        },
      });

      if (!user || !user.isActive || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException();
      }

      const roles = user.roles.map((ur) => ur.role.name);
      const newPayload = {
        sub: user.id,
        username: user.username,
        email: user.email,
        roles,
      };

      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: env.jwtRefreshSecret,
        expiresIn: env.jwtRefreshExpiration,
      });

      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid');
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission),
        ),
      ),
    ].map((p) => `${p.module}.${p.action}`);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      roles,
      permissions,
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        module: 'auth',
        description: 'User logged out',
      },
    });

    return { success: true };
  }
}
