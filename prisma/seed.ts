import './load-env';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  ALL_PERMISSIONS,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  ROLE_POLICIES,
} from './permissions.config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============================================================
  // 1. SCHOOL PROFILE
  // ============================================================
  const school = await prisma.schoolProfile.create({
    data: {
      name: 'Madrasah Diniyah Darussalam',
      nsm: '242811040101',
      npsn: '',
      address: 'Jl. Pendidikan No. 1',
      village: 'Desa Ilmu',
      district: 'Kecamatan Pendidikan',
      regency: 'Kabupaten Wali Songo',
      province: 'Jawa Timur',
      postalCode: '65123',
      phone: '(0341) 123456',
      email: 'info@madrasahdiniyah.sch.id',
      website: 'https://madrasahdiniyah.sch.id',
      principalName: 'Dr. H. Ahmad Dahlan, M.Pd.I',
      vision: 'Mewujudkan lulusan yang beriman, bertakwa, cerdas, dan berkarakter mulia',
      mission: '1. Menyelenggarakan pendidikan Islam yang berkualitas\n2. Membentuk santri yang berakhlakul karimah\n3. Mengembangkan potensi santri secara optimal',
      isInitialized: false,
    },
  });
  console.log('✅ School profile created');

  // ============================================================
  // 2. ROLES
  // ============================================================
  const roles = await Promise.all([
    prisma.role.create({
      data: { name: 'SUPER_ADMIN', description: 'Super Administrator', isSystem: true },
    }),
    prisma.role.create({
      data: { name: 'ADMIN', description: 'Administrator', isSystem: true },
    }),
    prisma.role.create({
      data: { name: 'OPERATOR', description: 'Operator Sekolah', isSystem: true },
    }),
    prisma.role.create({
      data: { name: 'HEADMASTER', description: 'Kepala Madrasah', isSystem: true },
    }),
    prisma.role.create({
      data: { name: 'TEACHER', description: 'Guru', isSystem: true },
    }),
    prisma.role.create({
      data: { name: 'HOMEROOM_TEACHER', description: 'Wali Kelas', isSystem: true },
    }),
  ]);
  console.log('✅ Roles created');

  // ============================================================
  // 3. PERMISSIONS
  // ============================================================
  const permissions = [];
  for (const mod of PERMISSION_MODULES) {
    for (const action of PERMISSION_ACTIONS) {
      const perm = await prisma.permission.create({
        data: { module: mod, action },
      });
      permissions.push(perm);
    }
  }
  console.log(`✅ Permissions created (${permissions.length})`);

  // Terapkan kebijakan permission per role (lihat permissions.config.ts)
  const permissionIdByKey = new Map(
    permissions.map((perm) => [`${perm.module}.${perm.action}`, perm.id]),
  );

  for (const role of roles) {
    const policy =
      role.name === 'SUPER_ADMIN'
        ? ALL_PERMISSIONS
        : ROLE_POLICIES[role.name] ?? [];

    for (const key of policy) {
      const permissionId = permissionIdByKey.get(key);
      if (!permissionId) continue;
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId },
      });
    }
  }
  console.log('✅ Role permissions assigned');

  // ============================================================
  // 4. USERS
  // ============================================================
  const password = await bcrypt.hash('admin123', 12);
  const superAdminRole = roles.find((r) => r.name === 'SUPER_ADMIN')!;
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@smartmadin.id',
      password,
      fullName: 'Administrator',
      isActive: true,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: superAdminRole.id,
    },
  });
  console.log('✅ Admin user created (username: admin, password: admin123)');

  // ============================================================
  // 5. ACADEMIC YEAR
  // ============================================================
  const academicYear = await prisma.academicYear.create({
    data: {
      name: '2024/2025',
      startDate: new Date('2024-07-01'),
      endDate: new Date('2025-06-30'),
      isActive: true,
    },
  });
  console.log('✅ Academic year created: 2024/2025');

  // ============================================================
  // 6. LEVELS
  // ============================================================
  const levels = await Promise.all([
    prisma.level.create({
      data: {
        code: 'TPQ',
        name: 'TPQ',
        description: 'Taman Pendidikan Al-Quran',
        displayOrder: 1,
        isActive: true,
      },
    }),
    prisma.level.create({
      data: {
        code: 'AW',
        name: 'Awaliyah',
        description: 'Tingkat Awaliyah',
        displayOrder: 2,
        isActive: true,
      },
    }),
    prisma.level.create({
      data: {
        code: 'WU',
        name: 'Wustha',
        description: 'Tingkat Wustha',
        displayOrder: 3,
        isActive: true,
      },
    }),
    prisma.level.create({
      data: {
        code: 'UL',
        name: 'Ulya',
        description: 'Tingkat Ulya',
        displayOrder: 4,
        isActive: true,
      },
    }),
  ]);
  console.log('✅ Levels created: TPQ, Awaliyah, Wustha, Ulya');

  // ============================================================
  // 7. CLASSES
  // ============================================================
  const classData = [
    { level: 'TPQ', name: 'TPQ I', code: 'TPQ-01' },
    { level: 'TPQ', name: 'TPQ II', code: 'TPQ-02' },
    { level: 'AW', name: 'I Awaliyah', code: 'AW-01' },
    { level: 'AW', name: 'II Awaliyah', code: 'AW-02' },
    { level: 'AW', name: 'III Awaliyah', code: 'AW-03' },
    { level: 'AW', name: 'IV Awaliyah', code: 'AW-04' },
    { level: 'WU', name: 'I Wustha', code: 'WU-01' },
    { level: 'WU', name: 'II Wustha', code: 'WU-02' },
    { level: 'UL', name: 'I Ulya', code: 'UL-01' },
    { level: 'UL', name: 'II Ulya', code: 'UL-02' },
  ];

  const levelMap = Object.fromEntries(levels.map((l) => [l.code, l.id]));

  for (const cls of classData) {
    await prisma.class.create({
      data: {
        levelId: levelMap[cls.level],
        academicYearId: academicYear.id,
        name: cls.name,
        code: cls.code,
        capacity: 40,
        isActive: true,
      },
    });
  }
  console.log('✅ Classes created');

  // ============================================================
  // 8. SUBJECTS
  // ============================================================
  const subjectData = [
    { code: 'TIL', name: 'Tilawah Al-Quran', nameArabic: 'تلاوة القرآن' },
    { code: 'TAH', name: 'Tahfidz Al-Quran', nameArabic: 'تحفيظ القرآن' },
    { code: 'FIQ', name: 'Fiqih', nameArabic: 'الفقه' },
    { code: 'AQA', name: 'Aqidah', nameArabic: 'العقيدة' },
    { code: 'AKH', name: 'Akhlak', nameArabic: 'الأخلاق' },
    { code: 'TAR', name: 'Tarikh', nameArabic: 'التاريخ' },
    { code: 'BTR', name: 'Bahasa Arab', nameArabic: 'اللغة العربية' },
    { code: 'FIQ', name: 'Tajwid', nameArabic: 'التجويد' },
    { code: 'DKW', name: 'Dakwah', nameArabic: 'الدعوة' },
    { code: 'BTI', name: 'Baca Tulis Al-Quran', nameArabic: 'قراءة القرآن' },
  ];

  for (const subj of subjectData) {
    try {
      await prisma.subject.create({
        data: {
          code: subj.code,
          name: subj.name,
          nameArabic: subj.nameArabic,
          isActive: true,
        },
      });
    } catch (e: any) {
      // Skip duplicate codes
      if (e.code !== 'P2002') throw e;
    }
  }
  console.log('✅ Subjects created');

  // ============================================================
  // 9. SYSTEM SETTINGS
  // ============================================================
  const settings = [
    { key: 'app_name', value: 'SMART MADIN', category: 'general' },
    { key: 'timezone', value: '"Asia/Jakarta"', category: 'general' },
    { key: 'date_format', value: '"DD/MM/YYYY"', category: 'general' },
    { key: 'default_page_size', value: '20', category: 'general' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.create({
      data: {
        key: setting.key,
        value: setting.value,
        category: setting.category,
      },
    });
  }
  console.log('✅ System settings created');

  // Mark school as initialized
  await prisma.schoolProfile.update({
    where: { id: school.id },
    data: { isInitialized: true },
  });
  console.log('✅ School marked as initialized');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
