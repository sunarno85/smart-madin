import { SetMetadata } from '@nestjs/common';

export const AUTHENTICATED_ONLY_KEY = 'authenticatedOnly';

/**
 * Endpoint hanya membutuhkan login, tanpa izin (permission) khusus.
 * Gunakan untuk data yang dipakai semua peran, misalnya profil madrasah
 * untuk header cetak dan data user yang sedang login.
 */
export const AuthenticatedOnly = () =>
  SetMetadata(AUTHENTICATED_ONLY_KEY, true);
