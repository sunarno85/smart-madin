/**
 * Sinkronisasi permission & role-permission dengan kebijakan di
 * `permissions.config.ts`.
 *
 * Jalankan: npm run sync:permissions
 *
 * Sifat script: idempotent dan rekonsiliasi penuh.
 * - Permission baru ditambahkan.
 * - Grant role disesuaikan dengan ROLE_POLICIES (grant berlebih dihapus,
 *   grant yang kurang ditambahkan).
 * - SUPER_ADMIN selalu mendapat semua permission.
 */
import './load-env';
import { PrismaClient } from '@prisma/client';
import {
  ALL_PERMISSIONS,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  ROLE_POLICIES,
} from './permissions.config';

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Sinkronisasi permission...');

  // 1. Pastikan semua permission ada
  const permissionIdByKey = new Map<string, string>();

  for (const module of PERMISSION_MODULES) {
    for (const action of PERMISSION_ACTIONS) {
      const permission = await prisma.permission.upsert({
        where: { module_action: { module, action } },
        update: {},
        create: { module, action },
      });
      permissionIdByKey.set(`${module}.${action}`, permission.id);
    }
  }
  console.log(`✅ ${permissionIdByKey.size} permission tersedia`);

  // 2. Rekonsiliasi grant per role
  const roles = await prisma.role.findMany({ select: { id: true, name: true } });

  for (const role of roles) {
    const policy = ROLE_POLICIES[role.name];
    if (!policy) {
      console.log(
        `⚠️  Role "${role.name}" tidak punya kebijakan — grant lama dibiarkan.`,
      );
      continue;
    }

    const targetKeys =
      role.name === 'SUPER_ADMIN' ? ALL_PERMISSIONS : policy;
    const targetIds = targetKeys
      .map((key) => permissionIdByKey.get(key))
      .filter((id): id is string => Boolean(id));

    const existing = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { id: true, permissionId: true },
    });
    const existingIds = new Set(existing.map((rp) => rp.permissionId));
    const targetIdSet = new Set(targetIds);

    const toAdd = targetIds.filter((id) => !existingIds.has(id));
    const toRemove = existing
      .filter((rp) => !targetIdSet.has(rp.permissionId))
      .map((rp) => rp.id);

    if (toAdd.length > 0) {
      await prisma.rolePermission.createMany({
        data: toAdd.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }
    if (toRemove.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: { id: { in: toRemove } },
      });
    }

    console.log(
      `   ${role.name}: +${toAdd.length} / -${toRemove.length} (total ${targetIds.length})`,
    );
  }

  console.log('🎉 Sinkronisasi permission selesai.');
}

main()
  .catch((error) => {
    console.error('❌ Gagal sinkronisasi permission:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
