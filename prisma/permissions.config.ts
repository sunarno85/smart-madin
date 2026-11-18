// ============================================================
// Definisi modul & kebijakan permission SMART MADIN
// Dipakai oleh seed.ts dan sync-permissions.ts agar konsisten.
// ============================================================

export const PERMISSION_MODULES = [
  'students',
  'employees',
  'classes',
  'schedules',
  'subjects',
  'academic_years',
  'levels',
  'attendance',
  'assessments',
  'reports',
  'imports',
  'ppdb',
  'promotion',
  'notifications',
  'users',
  'roles',
  'audit',
  'dashboard',
  'settings',
  'announcements',
] as const;

export const PERMISSION_ACTIONS = [
  'read',
  'create',
  'update',
  'delete',
  'manage',
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type PermissionKey = `${PermissionModule}.${PermissionAction}`;

const ALL: PermissionKey[] = PERMISSION_MODULES.flatMap((module) =>
  PERMISSION_ACTIONS.map((action) => `${module}.${action}` as PermissionKey),
);

const readOnly = (modules: readonly PermissionModule[]): PermissionKey[] =>
  modules.map((module) => `${module}.read` as PermissionKey);

const fullAccess = (modules: readonly PermissionModule[]): PermissionKey[] =>
  modules.flatMap((module) =>
    PERMISSION_ACTIONS.map((action) => `${module}.${action}` as PermissionKey),
  );

const OPERATIONAL_MODULES: PermissionModule[] = [
  'students',
  'employees',
  'classes',
  'schedules',
  'subjects',
  'academic_years',
  'levels',
  'attendance',
  'assessments',
  'reports',
  'imports',
  'ppdb',
  'promotion',
  'notifications',
  'dashboard',
  'settings',
  'announcements',
];

/**
 * Permission default per role.
 * - SUPER_ADMIN selalu mendapat semua permission.
 * - ADMIN mengelola data & pengguna, tetapi tidak boleh mengubah role
 *   (mencegah eskalasi hak akses).
 * - Role lain hanya mendapat yang relevan dengan tugasnya.
 */
export const ROLE_POLICIES: Record<string, PermissionKey[]> = {
  SUPER_ADMIN: ALL,

  ADMIN: [
    ...fullAccess(OPERATIONAL_MODULES),
    ...fullAccess(['users']),
    ...readOnly(['roles', 'audit']),
  ],

  OPERATOR: [
    ...readOnly(OPERATIONAL_MODULES),
    ...fullAccess([
      'students',
      'employees',
      'classes',
      'schedules',
      'subjects',
      'academic_years',
      'levels',
      'attendance',
      'assessments',
      'imports',
      'ppdb',
    ]),
    'promotion.read' as PermissionKey,
    'notifications.read' as PermissionKey,
  ],

  HEADMASTER: [
    ...readOnly(OPERATIONAL_MODULES),
    ...readOnly(['audit']),
  ],

  TEACHER: [
    ...readOnly([
      'students',
      'employees',
      'classes',
      'schedules',
      'subjects',
      'academic_years',
      'levels',
      'attendance',
      'assessments',
      'reports',
      'promotion',
      'dashboard',
      'settings',
    ]),
    'attendance.create' as PermissionKey,
    'attendance.update' as PermissionKey,
    'assessments.create' as PermissionKey,
    'assessments.update' as PermissionKey,
  ],

  HOMEROOM_TEACHER: [
    ...readOnly([
      'students',
      'employees',
      'classes',
      'schedules',
      'subjects',
      'academic_years',
      'levels',
      'attendance',
      'assessments',
      'reports',
      'promotion',
      'dashboard',
      'settings',
    ]),
    'attendance.create' as PermissionKey,
    'attendance.update' as PermissionKey,
    'assessments.create' as PermissionKey,
    'assessments.update' as PermissionKey,
  ],
};

export const ALL_PERMISSIONS = ALL;
