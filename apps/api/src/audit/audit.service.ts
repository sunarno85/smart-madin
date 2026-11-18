import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    pageSize?: number;
    module?: string;
    action?: string;
    userId?: string;
  }) {
    const { page = 1, pageSize = 20, module, action, userId } = params;

    const where: any = {};
    if (module) where.module = module;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, username: true, fullName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.count({ where }),
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

  async log(data: {
    userId?: string;
    action: string;
    module: string;
    entity?: string;
    entityId?: string;
    description?: string;
    oldData?: any;
    newData?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        module: data.module,
        entity: data.entity,
        entityId: data.entityId,
        description: data.description,
        oldData: data.oldData,
        newData: data.newData,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }
}
