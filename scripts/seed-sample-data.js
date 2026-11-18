#!/usr/bin/env node
/**
 * Seed sample data: 25 students across classes + 8 employees
 * Run: node scripts/seed-sample-data.js
 */

const http = require('http');
const API = 'http://localhost:3000';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, data: b }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const CLASSES = {
  'TPQ I': 'f062cad5-7f44-40ee-9bfb-2b5eeea0c6bc',
  'TPQ II': '8ae36938-a222-43e9-aaff-5ce8422e3e31',
  'I Awaliyah': 'fa11d824-e87a-4d22-97b8-ffd5703c0683',
  'II Awaliyah': 'cb0471a7-0825-482f-8a10-e3725deb1778',
  'III Awaliyah': '95a74c16-9d8a-4713-8bcb-ce3d9af8d221',
  'IV Awaliyah': 'd2233291-e6e6-4121-b6ab-3347fc0b71f7',
  'I Wustha': '0ac0bf06-74c7-4446-8d74-7e9ddc8e947f',
  'II Wustha': '48f1bf64-cf8d-4cf1-98a0-87e74c6f807e',
  'I Ulya': '354bf14d-b07e-4434-b93a-cdf5f0ec985f',
  'II Ulya': '80cc1259-1f81-46c1-806b-1f0fda8c5a07',
};

const STUDENTS = [
  // TPQ I (5)
  { name: 'Aisha Putri', gender: 'FEMALE', nik: '3521010101020001', nisn: '0020001001', cls: 'TPQ I', fname: 'Budi Santoso', fphone: '081234567001', focc: 'Wiraswasta', mname: 'Siti Santoso', mphone: '081234567101', mocc: 'IRT' },
  { name: 'Abdullah Rahman', gender: 'MALE', nik: '3521010101020002', nisn: '0020001002', cls: 'TPQ I', fname: 'Hendra Rahman', fphone: '081234567002', focc: 'Guru', mname: 'Rina Rahman', mphone: '081234567102', mocc: 'IRT' },
  { name: 'Fatimah Zahra', gender: 'FEMALE', nik: '3521010101020003', nisn: '0020001003', cls: 'TPQ I', fname: 'Dedi Pratama', fphone: '081234567003', focc: 'Petani', mname: 'Lina Pratama', mphone: '081234567103', mocc: 'Pedagang' },
  { name: 'Umar Faruq', gender: 'MALE', nik: '3521010101020004', nisn: '0020001004', cls: 'TPQ I', fname: 'Agus Wibowo', fphone: '081234567004', focc: 'Karyawan', mname: 'Dwi Wibowo', mphone: '081234567104', mocc: 'IRT' },
  { name: 'Maryam Azzahra', gender: 'FEMALE', nik: '3521010101020005', nisn: '0020001005', cls: 'TPQ I', fname: 'Farid Hidayat', fphone: '081234567005', focc: 'Buruh', mname: 'Eka Hidayat', mphone: '081234567105', mocc: 'IRT' },
  // TPQ II (3)
  { name: 'Muhammad Hidayat', gender: 'MALE', nik: '3521010101020006', nisn: '0020001006', cls: 'TPQ II', fname: 'Imam Hidayat', fphone: '081234567006', focc: 'Tukang', mname: 'Nina Hidayat', mphone: '081234567106', mocc: 'IRT' },
  { name: 'Khadijah Nurul', gender: 'FEMALE', nik: '3521010101020007', nisn: '0020001007', cls: 'TPQ II', fname: 'Khalid Putra', fphone: '081234567007', focc: 'PNS', mname: 'Ayu Putra', mphone: '081234567107', mocc: 'Guru' },
  { name: 'Yusuf Al-Kafi', gender: 'MALE', nik: '3521010101020008', nisn: '0020001008', cls: 'TPQ II', fname: 'Rudi Al-Kafi', fphone: '081234567008', focc: 'Driver', mname: 'Wati Al-Kafi', mphone: '081234567108', mocc: 'IRT' },
  // I Awaliyah (3)
  { name: 'Hamzah Rizky', gender: 'MALE', nik: '3521010101020009', nisn: '0020001009', cls: 'I Awaliyah', fname: 'Mimin Rizky', fphone: '081234567009', focc: 'Wiraswasta', mname: 'Yanti Rizky', mphone: '081234567109', mocc: 'IRT' },
  { name: 'Zainab Salsabila', gender: 'FEMALE', nik: '3521010101020010', nisn: '0020001010', cls: 'I Awaliyah', fname: 'Tono Salsabila', fphone: '081234567010', focc: 'Pramuwisata', mname: 'Titin Salsabila', mphone: '081234567110', mocc: 'Pedagang' },
  { name: 'Bilal Ahmad', gender: 'MALE', nik: '3521010101020011', nisn: '0020001011', cls: 'I Awaliyah', fname: 'Joko Ahmad', fphone: '081234567011', focc: 'Mekanik', mname: 'Ratna Ahmad', mphone: '081234567111', mocc: 'IRT' },
  // II Awaliyah (3)
  { name: 'Halimah Suci', gender: 'FEMALE', nik: '3521010101020012', nisn: '0020001012', cls: 'II Awaliyah', fname: 'Djoko Suci', fphone: '081234567012', focc: 'Kuli', mname: 'Murni Suci', mphone: '081234567112', mocc: 'IRT' },
  { name: 'Ibrahim Malik', gender: 'MALE', nik: '3521010101020013', nisn: '0020001013', cls: 'II Awaliyah', fname: 'Sumarno Malik', fphone: '081234567013', focc: 'Tani', mname: 'Supiah Malik', mphone: '081234567113', mocc: 'IRT' },
  { name: 'Nurul Huda', gender: 'MALE', nik: '3521010101020014', nisn: '0020001014', cls: 'II Awaliyah', fname: 'Wahyu Huda', fphone: '081234567014', focc: 'Pedagang', mname: 'Sri Huda', mphone: '081234567114', mocc: 'IRT' },
  // III Awaliyah (3)
  { name: 'Safiya Nur', gender: 'FEMALE', nik: '3521010101020015', nisn: '0020001015', cls: 'III Awaliyah', fname: 'Gunawan Nur', fphone: '081234567015', focc: 'Satpam', mname: 'Elin Nur', mphone: '081234567115', mocc: 'IRT' },
  { name: 'Danial Hakim', gender: 'MALE', nik: '3521010101020016', nisn: '0020001016', cls: 'III Awaliyah', fname: 'Heri Hakim', fphone: '081234567016', focc: 'Ojek Online', mname: 'Dwi Hakim', mphone: '081234567116', mocc: 'IRT' },
  { name: 'Aminah Rahma', gender: 'FEMALE', nik: '3521010101020017', nisn: '0020001017', cls: 'III Awaliyah', fname: 'Adi Rahma', fphone: '081234567017', focc: 'Buruh Tani', mname: 'Yuli Rahma', mphone: '081234567117', mocc: 'IRT' },
  // IV Awaliyah (3)
  { name: 'Rasyid Pratama', gender: 'MALE', nik: '3521010101020018', nisn: '0020001018', cls: 'IV Awaliyah', fname: 'Rudi Pratama', fphone: '081234567018', focc: 'Teknisi', mname: 'Nia Pratama', mphone: '081234567118', mocc: 'IRT' },
  { name: 'Aisyah Zahra', gender: 'FEMALE', nik: '3521010101020019', nisn: '0020001019', cls: 'IV Awaliyah', fname: 'Hadi Zahra', fphone: '081234567019', focc: 'Guru', mname: 'Ana Zahra', mphone: '081234567119', mocc: 'Guru' },
  { name: 'Hasan Bashiri', gender: 'MALE', nik: '3521010101020020', nisn: '0020001020', cls: 'IV Awaliyah', fname: 'Amin Bashiri', fphone: '081234567020', focc: 'Wiraswasta', mname: 'Umi Bashiri', mphone: '081234567120', mocc: 'Pedagang' },
  // I Wustha (2)
  { name: 'Nabil Fauzan', gender: 'MALE', nik: '3521010101020021', nisn: '0020001021', cls: 'I Wustha', fname: 'Ruslan Fauzan', fphone: '081234567021', focc: 'Kontraktor', mname: 'Nurul Fauzan', mphone: '081234567121', mocc: 'IRT' },
  { name: 'Rania Meutia', gender: 'FEMALE', nik: '3521010101020022', nisn: '0020001022', cls: 'I Wustha', fname: 'Faisal Meutia', fphone: '081234567022', focc: 'PNS', mname: 'Rina Meutia', mphone: '081234567122', mocc: 'IRT' },
  // II Wustha (2)
  { name: 'Thariq bin Ziyad', gender: 'MALE', nik: '3521010101020023', nisn: '0020001023', cls: 'II Wustha', fname: 'Ismail Ziyad', fphone: '081234567023', focc: 'Ustadz', mname: 'Latifah Ziyad', mphone: '081234567123', mocc: 'IRT' },
  { name: 'Hana Syakira', gender: 'FEMALE', nik: '3521010101020024', nisn: '0020001024', cls: 'II Wustha', fname: 'Rahmat Syakira', fphone: '081234567024', focc: 'Dokter', mname: 'Putri Syakira', mphone: '081234567124', mocc: 'Perawat' },
  // I Ulya (2)
  { name: 'Ali Imran', gender: 'MALE', nik: '3521010101020025', nisn: '0020001025', cls: 'I Ulya', fname: 'Salman Imran', fphone: '081234567025', focc: 'Advokat', mname: 'Halimah Imran', mphone: '081234567125', mocc: 'IRT' },
  { name: 'Ruqayyah Amin', gender: 'FEMALE', nik: '3521010101020026', nisn: '0020001026', cls: 'I Ulya', fname: 'Yusri Amin', fphone: '081234567026', focc: 'Ustadz', mname: 'Hafsah Amin', mphone: '081234567126', mocc: 'IRT' },
];

const EMPLOYEES = [
  { name: 'Ustadzah Nurul Hidayah', gender: 'FEMALE', type: 'TEACHER', nik: '3521010101030001', edu: 'S2', subj: 'Akhlak', birth: '1985-03-15' },
  { name: 'Ustadz Ahmad Zainuri', gender: 'MALE', type: 'TEACHER', nik: '3521010101030002', edu: 'S2', subj: 'Aqidah', birth: '1982-07-20' },
  { name: 'Ustadzah Fatimah Noer', gender: 'FEMALE', type: 'TEACHER', nik: '3521010101030003', edu: 'S1', subj: 'Baca Tulis Al-Quran', birth: '1988-11-05' },
  { name: 'Ustadz Muhammad Fadil', gender: 'MALE', type: 'TEACHER', nik: '3521010101030004', edu: 'S2', subj: 'Bahasa Arab', birth: '1980-01-12' },
  { name: 'Ustadzah Aminah Salim', gender: 'FEMALE', type: 'TEACHER', nik: '3521010101030005', edu: 'S1', subj: 'Fiqih', birth: '1986-09-28' },
  { name: 'Ustadz Ali Musthofa', gender: 'MALE', type: 'TEACHER', nik: '3521010101030008', edu: 'S1', subj: 'Hadits', birth: '1983-04-10' },
  { name: 'Pak Bambang Suryadi', gender: 'MALE', type: 'STAFF', nik: '3521010101030006', edu: 'SMA', subj: null, birth: '1978-12-01' },
  { name: 'Ibu Dewi Kartika', gender: 'FEMALE', type: 'STAFF', nik: '3521010101030007', edu: 'D3', subj: null, birth: '1990-06-18' },
];

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rndPhone() { return '081' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0'); }

async function main() {
  console.log('🔐 Login...');
  const loginRes = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  const token = loginRes.data.accessToken;
  console.log('✅ Authenticated\n');

  // Get academic year
  const yearRes = await request('GET', '/api/academic-years', null, token);
  const yearId = yearRes.data[0]?.id;
  console.log(`📅 Academic Year: ${yearRes.data[0]?.name} (${yearId})\n`);

  // ─── STUDENTS ───
  console.log('📚 Seeding 26 students...');
  let sOk = 0, sFail = 0;
  for (const s of STUDENTS) {
    const body = {
      fullName: s.name, gender: s.gender, nik: s.nik, nisn: s.nisn,
      birthPlace: 'Kediri', birthDate: '2014-05-15',
      address: rnd(['Ds. Sukamaju', 'Ds. Harapan Jaya', 'Ds. Al-Wasilah', 'Ds. Nurul Iman', 'Ds. Mekarsari']),
      district: 'Ngasem', regency: 'Kediri', province: 'Jawa Timur',
      status: 'ACTIVE', guardianName: s.fname, guardianPhone: s.fphone,
      fatherName: s.fname, fatherNik: String(Number(s.nik) + 1000),
      fatherPhone: s.fphone, fatherOccupation: s.focc,
      motherName: s.mname, motherNik: String(Number(s.nik) + 2000),
      motherPhone: s.mphone, motherOccupation: s.mocc,
    };
    const res = await request('POST', '/api/students', body, token);
    if (res.status === 201 || res.status === 200) {
      sOk++;
      const sid = res.data.id;
      // Assign to class
      const aRes = await request('POST', `/api/students/${sid}/assign-class`, { classId: CLASSES[s.cls], academicYearId: yearId }, token);
      const mark = aRes.status === 201 || aRes.status === 200 ? '✓' : '✗';
      console.log(`  ${mark} ${s.name} → ${s.cls} (${s.gender === 'MALE' ? 'L' : 'P'})`);
    } else {
      sFail++;
      console.log(`  ✗ ${s.name}: ${res.status} ${(typeof res.data === 'string' ? res.data : JSON.stringify(res.data)).substring(0, 100)}`);
    }
  }

  // ─── EMPLOYEES ───
  console.log(`\n👨‍🏫 Seeding ${EMPLOYEES.length} employees...`);
  let eOk = 0;
  for (const e of EMPLOYEES) {
    const body = {
      fullName: e.name, gender: e.gender, nik: e.nik,
      employeeType: e.type, activityStatus: 'ACTIVE',
      employmentStatus: e.type === 'TEACHER' ? 'PNS' : 'Honorer',
      educationLevel: e.edu, subjectArea: e.subj,
      birthPlace: 'Kediri', birthDate: e.birth,
      address: rnd(['Jl. KH. Abdul Wahab', 'Jl. Sunan Ampel', 'Jl. Masjid Al-Hikmah', 'Jl. Pahlawan']),
      phone: rndPhone(), email: e.name.toLowerCase().replace(/[^a-z]/g, '').substring(0, 18) + '@smartmadin.id',
      startDate: '2020-07-01',
    };
    const res = await request('POST', '/api/employees', body, token);
    if (res.status === 201 || res.status === 200) {
      eOk++;
      console.log(`  ✓ ${e.name} (${e.type})`);
    } else {
      console.log(`  ✗ ${e.name}: ${res.status}`);
    }
  }

  // ─── DASHBOARD ───
  console.log('\n📊 Dashboard Stats:');
  const dash = await request('GET', '/api/dashboard/overview', null, token);
  const d = dash.data;
  console.log(`  Students: ${d.totalStudents} (Active: ${d.activeStudents}, Male: ${d.maleStudents}, Female: ${d.femaleStudents})`);
  console.log(`  Employees: ${d.totalEmployees}`);
  console.log(`  Classes: ${d.activeClasses}, Levels: ${d.activeLevels}`);

  console.log(`\n✅ Done! ${sOk} students + ${sFail} failed, ${eOk} employees seeded.`);
}

main().catch(console.error);
