import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * E2E minimal: memastikan aplikasi berjalan, autentikasi berfungsi,
 * RBAC ditegakkan, endpoint publik tetap terbuka, dan audit interceptor
 * benar-benar menulis log untuk mutasi yang berhasil.
 *
 * Catatan: test ini memakai database development yang sudah di-seed
 * (akun admin/headmaster dengan password admin123).
 */
describe('SMART MADIN API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let headmasterToken: string;
  let subjectId: string | undefined;
  let subjectCode: string;
  const startedAt = new Date();

  const http = () => request(app.getHttpServer());

  async function login(username: string, password: string): Promise<string> {
    const response = await http()
      .post('/api/auth/login')
      .send({ username, password })
      .expect(200);
    expect(response.body.accessToken).toBeDefined();
    return response.body.accessToken as string;
  }

  function bearer(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  async function waitForAudit(module: string, predicate: (log: any) => boolean) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const logs = await prisma.activityLog.findMany({
        where: { module, createdAt: { gte: startedAt } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const found = logs.find(predicate);
      if (found) return found;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`Audit log pada modul "${module}" tidak ditemukan`);
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    adminToken = await login('admin', 'admin123');
    headmasterToken = await login('headmaster', 'admin123');
    subjectCode = `E2E-${Date.now()}`;
  });

  afterAll(async () => {
    if (subjectId) {
      await prisma.activityLog.deleteMany({
        where: { description: { contains: subjectId } },
      });
      await prisma.subject.deleteMany({ where: { id: subjectId } });
    }
    if (app) await app.close();
  });

  describe('Autentikasi', () => {
    it('menolak login dengan kredensial salah', async () => {
      await http()
        .post('/api/auth/login')
        .send({ username: 'pengguna-tidak-ada', password: 'salah' })
        .expect(401);
    });

    it('memberikan token untuk kredensial valid', async () => {
      const response = await http()
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' })
        .expect(200);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.user.username).toBe('admin');
      expect(response.body.user.roles).toContain('SUPER_ADMIN');
    });

    it('mengembalikan data profil untuk token valid', async () => {
      const response = await http()
        .get('/api/auth/me')
        .set(bearer(adminToken))
        .expect(200);
      expect(response.body.username).toBe('admin');
    });
  });

  describe('RBAC', () => {
    it('menolak endpoint terlindungi tanpa token', async () => {
      await http().get('/api/students').expect(401);
    });

    it('mengizinkan admin membaca data santri', async () => {
      await http()
        .get('/api/students?pageSize=1')
        .set(bearer(adminToken))
        .expect(200);
    });

    it('mengizinkan headmaster membaca data santri', async () => {
      await http()
        .get('/api/students?pageSize=1')
        .set(bearer(headmasterToken))
        .expect(200);
    });

    it('melarang headmaster mengakses manajemen pengguna dan role', async () => {
      await http().get('/api/users').set(bearer(headmasterToken)).expect(403);
      await http().get('/api/roles').set(bearer(headmasterToken)).expect(403);
    });

    it('melarang headmaster mengubah data', async () => {
      await http()
        .post('/api/students')
        .set(bearer(headmasterToken))
        .send({ fullName: 'E2E ditolak', gender: 'MALE' })
        .expect(403);

      await http()
        .patch('/api/school/profile')
        .set(bearer(headmasterToken))
        .send({ name: 'E2E ditolak' })
        .expect(403);
    });

    it('mengizinkan headmaster membaca audit log', async () => {
      await http().get('/api/audit').set(bearer(headmasterToken)).expect(200);
    });

    it('membiarkan endpoint PPDB publik diakses tanpa token', async () => {
      await http().get('/api/ppdb/public/years').expect(200);
    });
  });

  describe('Audit log global', () => {
    it('mencatat mutasi yang berhasil dan menyimpan respons tanpa data sensitif', async () => {
      const created = await http()
        .post('/api/subjects')
        .set(bearer(adminToken))
        .send({ code: subjectCode, name: 'Mata pelajaran E2E' })
        .expect(201);

      subjectId = created.body.id;
      expect(subjectId).toEqual(expect.any(String));

      const createLog = await waitForAudit(
        'subjects',
        (log) =>
          log.action === 'CREATE' &&
          log.description === 'POST /api/subjects' &&
          JSON.stringify(log.newData ?? '').includes(subjectCode),
      );
      expect(createLog.userId).toEqual(expect.any(String));
      expect(JSON.stringify(createLog.newData)).not.toMatch(/password|token/i);

      await http()
        .delete(`/api/subjects/${subjectId}`)
        .set(bearer(adminToken))
        .expect(200);

      const deleteLog = await waitForAudit(
        'subjects',
        (log) =>
          log.action === 'DELETE' &&
          log.description === `DELETE /api/subjects/${subjectId}`,
      );
      expect(deleteLog.entity).toBe('subjects');
      expect(deleteLog.entityId).toBe(subjectId);
    });
  });
});
