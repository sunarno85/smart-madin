import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Menentukan izin yang dibutuhkan untuk mengakses endpoint.
 * Format: `<module>.<action>` contoh `students.read`, `students.create`.
 *
 * Bila lebih dari satu izin diberikan, pengguna harus memiliki semuanya.
 * SUPER_ADMIN selalu diizinkan.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
