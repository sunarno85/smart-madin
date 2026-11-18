import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
];
const MAX_STRING_LENGTH = 500;
const MAX_JSON_LENGTH = 6000;

/** Ubah body/response menjadi data aman untuk disimpan di audit log. */
function sanitize(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null;
  if (depth > 4) return '[dipotong]';

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}…`
      : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
        result[key] = '[disembunyikan]';
        continue;
      }
      result[key] = sanitize(item, depth + 1);
    }
    return result;
  }
  return String(value);
}

function toStorableJson(value: unknown): unknown | null {
  if (value === undefined || value === null) return null;
  const sanitized = sanitize(value);
  try {
    const serialized = JSON.stringify(sanitized);
    if (!serialized || serialized === '{}' || serialized === 'null') return null;
    if (serialized.length > MAX_JSON_LENGTH) {
      return { truncated: true, preview: serialized.slice(0, MAX_JSON_LENGTH) };
    }
    return sanitized;
  } catch {
    return null;
  }
}

/**
 * Audit log global untuk semua operasi yang mengubah data (POST/PATCH/PUT/DELETE).
 *
 * - Hanya mencatat request yang berhasil (status < 400).
 * - Modul diambil dari segmen pertama URL setelah prefix `/api`.
 * - Field sensitif (password, token, dsb.) tidak pernah disimpan.
 * - Kegagalan menulis log tidak boleh menggagalkan request pengguna.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = String(request.method || '').toUpperCase();

    if (!MUTATING_METHODS.has(method) || request.file || request.files) {
      return next.handle();
    }

    const path = String(request.path || request.url || '');
    const segments = path.split('?')[0].split('/').filter(Boolean);
    if (segments[0] === 'api') segments.shift();

    const module = segments[0] || 'unknown';
    // Login/logout/refresh sudah dicatat langsung oleh AuthService.
    if (module === 'auth') return next.handle();
    if (module === 'audit') return next.handle();

    const action =
      method === 'POST' ? 'CREATE' : method === 'DELETE' ? 'DELETE' : 'UPDATE';
    // `segments` sudah tanpa prefix "api":
    //  - /subjects           -> entity = subjects
    //  - /subjects/:id       -> entity = subjects, entityId = :id
    //  - /reports/students/x -> module = reports, entity = students
    const entity =
      segments.length > 2
        ? segments[1] !== 'public'
          ? segments[1]
          : null
        : segments[0] || null;

    const user = request.user;

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const statusCode = context.switchToHttp().getResponse()?.statusCode;
          if (typeof statusCode === 'number' && statusCode >= 400) return;

          const entityId =
            request.params?.id ||
            request.params?.studentId ||
            request.params?.employeeId ||
            (responseBody && typeof responseBody === 'object'
              ? (responseBody as Record<string, unknown>).id
              : null);

          void this.prisma.activityLog
            .create({
              data: {
                userId: user?.sub ?? null,
                action,
                module,
                entity: entity ?? undefined,
                entityId: entityId ? String(entityId) : undefined,
                description: `${method} ${path}`,
                newData: toStorableJson(responseBody) as any,
                ipAddress:
                  (request.headers?.['x-forwarded-for'] as string)
                    ?.split(',')[0]
                    ?.trim() ||
                  request.ip ||
                  undefined,
                userAgent: request.headers?.['user-agent'] || undefined,
              },
            })
            .catch(() => undefined);
        },
      }),
    );
  }
}
