import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Pemuat environment sederhana tanpa dependensi tambahan.
 *
 * Mencari file `.env` mulai dari direktori kerja lalu naik ke atas
 * (apps/api -> apps -> root proyek). Nilai yang sudah ada di
 * `process.env` tidak ditimpa.
 */
function parseEnvFile(content: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) values[key] = value;
  }

  return values;
}

function findEnvFile(startDir: string): string | null {
  let dir = startDir;
  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) return candidate;

    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const envFile = findEnvFile(process.cwd());
if (envFile) {
  const values = parseEnvFile(readFileSync(envFile, 'utf8'));
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const isProduction = process.env.NODE_ENV === 'production';

const DEV_DEFAULTS: Record<string, string> = {
  DATABASE_URL:
    'postgresql://smartmadin:smartmadin@localhost:5432/smartmadin?schema=public',
  JWT_SECRET: 'dev-secret',
  JWT_REFRESH_SECRET: 'dev-refresh-secret',
  JWT_EXPIRATION: '15m',
  JWT_REFRESH_EXPIRATION: '7d',
  API_PORT: '3000',
  APP_URL: 'http://localhost:5173',
};

const INSECURE_SECRET_PREFIXES = ['dev-', 'change-me', 'ganti-'];

function isInsecureSecret(value: string): boolean {
  return (
    value.length < 24 ||
    INSECURE_SECRET_PREFIXES.some((prefix) => value.startsWith(prefix))
  );
}

if (isProduction) {
  const missing = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'].filter(
    (key) => !process.env[key],
  );
  if (missing.length > 0) {
    throw new Error(
      `Environment variable wajib belum diisi: ${missing.join(', ')}. ` +
        'Aplikasi tidak dijalankan di production tanpa konfigurasi ini.',
    );
  }

  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    if (isInsecureSecret(process.env[key] as string)) {
      throw new Error(
        `${key} masih memakai nilai default/tidak aman. ` +
          'Gunakan secret acak minimal 32 karakter sebelum menjalankan production.',
      );
    }
  }
} else {
  for (const [key, value] of Object.entries(DEV_DEFAULTS)) {
    if (!process.env[key]) process.env[key] = value;
  }

  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    if (!isInsecureSecret(process.env[key] as string)) continue;
    console.warn(
      `⚠️  ${key} memakai nilai default pengembangan. ` +
        'Ganti dengan secret acak sebelum production.',
    );
  }
}

export const env = {
  isProduction,
  databaseUrl: process.env.DATABASE_URL as string,
  jwtSecret: process.env.JWT_SECRET as string,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET as string,
  jwtExpiration: process.env.JWT_EXPIRATION || '15m',
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  apiPort: parseInt(process.env.API_PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '5242880', 10),
};
