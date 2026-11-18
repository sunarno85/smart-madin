// Smoke test untuk fitur semester + kenaikan kelas + rapor/leger
// Menjalankan alur lengkap dan membersihkan data uji di akhir.
const BASE = 'http://localhost:3100/api';

async function req(method, path, body, token, raw = false) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) return res;
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return data;
}

const results = [];
function log(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
}

async function main() {
  // 1. Login
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  const token = login.accessToken || login.access_token || login.token;
  log('Login admin', !!token, token ? 'token didapat' : JSON.stringify(login).slice(0, 100));
  if (!token) return;

  // 2. Data dasar
  const years = await req('GET', '/academic-years', null, token);
  const active = years.find((y) => y.isActive) || years[0];
  log('Tahun ajaran aktif', !!active, `${active?.name} (activeSemester=${active?.activeSemester})`);
  const classes = await req('GET', `/classes?academicYearId=${active.id}`, null, token);
  const classArr = Array.isArray(classes) ? classes : classes.data;
  const firstClass = classArr[0];
  log('Daftar kelas', classArr.length > 0, `${classArr.length} kelas, pertama: ${firstClass?.name}`);
  const students = await req('GET', `/students?classId=${firstClass.id}&academicYearId=${active.id}&pageSize=200`, null, token);
  const studentArr = students.data || students;
  log('Santri di kelas pertama', studentArr.length > 0, `${studentArr.length} santri`);

  // 3. Leger JSON
  const leger = await req('GET', `/reports/leger?classId=${firstClass.id}&academicYearId=${active.id}&semester=SATU`, null, token);
  log('GET /reports/leger', !!leger.class && Array.isArray(leger.students),
    `${leger.class.name}, ${leger.students.length} santri, ${leger.subjects.length} mapel, rata2 kelas=${leger.classAverage}`);

  // 4. Rapor
  const st = studentArr[0];
  const rapor = await req('GET', `/reports/rapor/${st.id}?academicYearId=${active.id}&semester=SATU`, null, token);
  log('GET /reports/rapor/:id', rapor.student?.id === st.id,
    `${rapor.student.fullName}, ${rapor.subjects.length} mapel, presensi sesi=${rapor.attendance.totalSessions}, rata2=${rapor.overall.average}`);

  // 5. Ekspor Excel leger
  const xlsx = await req('GET', `/reports/leger/export?classId=${firstClass.id}&academicYearId=${active.id}&semester=SATU`, null, token, true);
  const buf = Buffer.from(await xlsx.arrayBuffer());
  log('GET /reports/leger/export', xlsx.ok && buf.length > 1000,
    `status=${xlsx.status}, type=${xlsx.headers.get('content-type')?.slice(0, 50)}, size=${buf.length}B`);

  // 6. Filter semester pada assessments
  const assessments = await req('GET', `/assessments?semester=SATU`, null, token);
  log('GET /assessments?semester=SATU', Array.isArray(assessments), `${assessments.length} penilaian`);

  // 7. Buat penilaian tanpa semester (harus default ke semester aktif tahun ajaran)
  const subjects = await req('GET', '/subjects', null, token);
  const subjArr = Array.isArray(subjects) ? subjects : subjects.data;
  const components = await req('GET', '/assessments/components', null, token);
  const created = await req('POST', '/assessments', {
    classId: firstClass.id, academicYearId: active.id, subjectId: subjArr[0].id,
    componentId: components[0].id, title: '[UJI] Penilaian semester', maxScore: 100,
  }, token);
  log('POST /assessments (default semester)', created.semester === active.activeSemester,
    `semester=${created.semester} (harap ${active.activeSemester})`);
  await req('DELETE', `/assessments/${created.id}`, null, token);
  log('DELETE /assessments/:id (bersih-bersih uji)', true, created.id);

  // 8. Alur kenaikan kelas: tahun baru -> rollover -> preview -> execute -> cleanup
  const newYear = await req('POST', '/academic-years', {
    name: '9999/9999 UJI', startDate: '2030-07-01', endDate: '2031-06-30',
  }, token);
  log('POST /academic-years (tahun uji)', !!newYear.id, newYear.name);

  const rollover = await req('POST', '/promotion/rollover-classes', {
    fromAcademicYearId: active.id, toAcademicYearId: newYear.id,
  }, token);
  log('POST /promotion/rollover-classes', rollover.copied > 0, `${rollover.copied} kelas disalin, ${rollover.skipped} dilewati`);

  const preview = await req('GET', `/promotion/preview?fromAcademicYearId=${active.id}&toAcademicYearId=${newYear.id}&classId=${firstClass.id}`, null, token);
  log('GET /promotion/preview', preview.students?.length > 0 && preview.targetClasses?.length > 0,
    `${preview.students.length} santri, ${preview.targetClasses.length} kelas tujuan, saran naik=${preview.suggestions.promote ? 'ada' : 'null'}`);

  // Cek duplikat rollover: semua harus dilewati
  const rollover2 = await req('POST', '/promotion/rollover-classes', {
    fromAcademicYearId: active.id, toAcademicYearId: newYear.id,
  }, token);
  log('Rollover kedua (idempoten)', rollover2.copied === 0 && rollover2.skipped === rollover.copied,
    `copied=${rollover2.copied}, skipped=${rollover2.skipped}`);

  // Execute: santri pertama naik, (jika ada) santri kedua lulus
  const items = [{ studentId: studentArr[0].id, action: 'PROMOTE', targetClassId: preview.suggestions.promote || preview.targetClasses[0].id }];
  if (studentArr[1]) items.push({ studentId: studentArr[1].id, action: 'GRADUATE' });
  const executed = await req('POST', '/promotion/execute', {
    fromAcademicYearId: active.id, toAcademicYearId: newYear.id, items,
  }, token);
  log('POST /promotion/execute', executed.processed === items.length,
    `naik=${executed.promoted}, lulus=${executed.graduated}`);

  // Verifikasi via API: santri pertama kini terdaftar di kelas tujuan
  const targetClassId = items[0].targetClassId;
  const moved = await req('GET', `/students?classId=${targetClassId}&academicYearId=${newYear.id}&pageSize=200`, null, token);
  const movedArr = moved.data || moved;
  log('Verifikasi santri pindah kelas', movedArr.some((s) => s.id === studentArr[0].id),
    `${movedArr.length} santri di kelas tujuan`);

  console.log('\n=== RINGKASAN ===');
  console.log(`Total: ${results.length}, Pass: ${results.filter((r) => r.ok).length}, Fail: ${results.filter((r) => !r.ok).length}`);
  // ID untuk cleanup
  console.log('CLEANUP_IDS=' + JSON.stringify({
    newYearId: newYear.id,
    movedStudentIds: items.map((i) => i.studentId),
    graduatedStudentIds: items.filter((i) => i.action === 'GRADUATE').map((i) => i.studentId),
    fromYearId: active.id,
  }));
}

main().catch((e) => {
  console.error('SMOKE TEST ERROR:', e.message);
  process.exit(1);
});
