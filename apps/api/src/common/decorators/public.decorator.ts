import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Menandai endpoint sebagai publik (tidak memerlukan autentikasi).
 * Contoh: login, refresh token, form PPDB publik.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
