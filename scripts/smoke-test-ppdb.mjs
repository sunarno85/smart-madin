// Smoke test alur PPDB: buka PPDB -> daftar publik -> cek status -> review admin -> enroll
// Data uji dibersihkan di akhir (kecuali toggle ppdbOpen yang dibiarkan terbuka).
import { PrismaClient } from '@prisma/client';

const BASE = process.env.TEST_BASE || 'http://localhost:3100/api';
const prisma = new PrismaClient();

async function req(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return data;
}

const results = [];
function log(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
}

async function main() {
  // 1. Login admin
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  const token = login.accessToken || login.token;
  log('Login admin', !!token);

  // 2. Buka PPDB tahun ajaran aktif
  const years = await req('GET', '/academic-years', null, token);
  const active = years.find((y) => y.isActive) || years[0];
  await req('PATCH', `/academic-years/${active.id}`, { ppdbOpen: true }, token);
  log('Buka PPDB tahun aktif', true, active.name);

  // 3. Tahun terbuka terlihat di endpoint publik
  const openYears = await req('GET', '/ppdb/public/years');
  log('GET /ppdb/public/years', openYears.some((y) => y.id === active.id), `${openYears.length} tahun buka`);

  // 4. Register publik tanpa login
  const reg = await req('POST', '/ppdb/public/register', {
    targetYearId: active.id,
    fullName: 'Uji Coba PPDB',
    gender: 'FEMALE',
    birthPlace: 'Kota Uji',
    birthDate: '2015-05-17',
    address: 'Jl. Testing No. 1',
    previousSchool: 'MI Uji Coba',
    fatherName: 'Ayah Uji',
    motherName: 'Ibu Uji',
    parentPhone: '081234567890',
  });
  log('POST /ppdb/public/register', !!reg.registrationNumber, `${reg.registrationNumber} (${reg.fullName})`);

  // 5. Cek status publik
  const status1 = await req('GET', `/ppdb/public/status?registrationNumber=${reg.registrationNumber}`);
  log('GET /ppdb/public/status', status1.status === 'BARU', `status=${status1.status}`);

  // 6. Register saat sudah dibuka: validasi field wajib
  let rejected = false;
  try { await req('POST', '/ppdb/public/register', { targetYearId: active.id, fullName: '', gender: 'MALE' }); }
  catch { rejected = true; }
  log('Validasi nama wajib', rejected);

  // 7. Admin: list & stats
  const list = await req('GET', `/ppdb/registrations?targetYearId=${active.id}`, null, token);
  const found = list.data.find((r) => r.id === reg.id);
  log('GET /ppdb/registrations', !!found, `${list.meta.total} pendaftar total`);
  const stats = await req('GET', `/ppdb/stats?targetYearId=${active.id}`, null, token);
  log('GET /ppdb/stats', stats.BARU >= 1, `baru=${stats.BARU}`);

  // 8. Review: verifikasi -> terima
  await req('PATCH', `/ppdb/registrations/${reg.id}/status`, { status: 'VERIFIED', notes: 'Berkas lengkap (uji)' }, token);
  const accepted = await req('PATCH', `/ppdb/registrations/${reg.id}/status`, { status: 'ACCEPTED' }, token);
  log('PATCH status VERIFIED -> ACCEPTED', accepted.status === 'ACCEPTED');

  // 9. Enroll jadi santri
  const enrolled = await req('POST', `/ppdb/registrations/${reg.id}/enroll`, null, token);
  const sid = enrolled.student?.id;
  log('POST enroll -> santri dibuat', enrolled.status === 'ENROLLED' && !!sid,
    `NIS=${enrolled.student?.studentNumber}`);

  // 10. Verifikasi santri + orang tua via DB (baca langsung)
  const student = await prisma.student.findUnique({
    where: { id: sid },
    include: { parents: true },
  });
  log('Santri tersimpan dengan orang tua', !!student && student.parents.length === 2,
    `${student?.fullName}, ${student?.parents.length} orang tua`);
  log('Nomor pendaftar tercatat di notes santri', student?.notes?.includes(reg.registrationNumber));

  // 11. Enroll kedua kali harus ditolak
  let dupRejected = false;
  try { await req('POST', `/ppdb/registrations/${reg.id}/enroll`, null, token); } catch { dupRejected = true; }
  log('Enroll ganda ditolak (409)', dupRejected);

  // ============ CLEANUP ============
  await prisma.studentParent.deleteMany({ where: { studentId: sid } });
  await prisma.ppdbRegistration.update({ where: { id: reg.id }, data: { studentId: null } });
  await prisma.student.delete({ where: { id: sid } });
  await prisma.ppdbRegistration.delete({ where: { id: reg.id } });
  await prisma.activityLog.deleteMany({ where: { module: 'ppdb', description: { contains: 'Uji Coba PPDB' } } });
  console.log('\nCLEANUP: santri uji, pendaftaran uji, dan log uji dihapus (ppdbOpen tetap terbuka)');

  console.log(`\n=== RINGKASAN === Total: ${results.length}, Pass: ${results.filter((r) => r.ok).length}, Fail: ${results.filter((r) => !r.ok).length}`);
}

main()
  .catch((e) => { console.error('SMOKE TEST ERROR:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
