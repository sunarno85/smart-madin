/**
 * Impor data nyata madrasah dari `Aplikasi Data Madin.xlsx`.
 *
 * Jalankan:
 *   npm run import:madin              # impor / perbarui tanpa menghapus data lain
 *   npm run import:madin -- --replace # hapus data demo (STU..., EMP...) lalu impor
 *
 * Sumber data:
 *  - Sheet "Identitas" & "Profil"        -> profil madrasah
 *  - Sheet "Data ptk" & "Tendik"         -> pegawai (PTK & tendik)
 *  - Sheet per kelas (TPQ 1, TPQ II, I AW, ... Ulya II) -> santri + kelas + orang tua
 *
 * Sifat: idempotent. Santri dicocokkan lewat NIK (fallback: nomor induk unik),
 * pegawai lewat nomor pegawai (PTK-xxx / TND-xxx), kelas lewat kode kelas.
 */
import './load-env';
import { PrismaClient, Gender, EmployeeType, ActivityStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import { existsSync } from 'fs';
import { resolve } from 'path';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const REPLACE_DEMO = args.includes('--replace');
const fileArg = args.find((arg) => arg.startsWith('--file='));
const WORKBOOK = fileArg
  ? resolve(fileArg.slice('--file='.length))
  : resolve(__dirname, '..', 'Aplikasi Data Madin.xlsx');

type Row = (string | number | Date | null | undefined)[];

interface SheetSpec {
  sheet: string;
  levelCode: 'TPQ' | 'AW' | 'WU' | 'UL';
  classCode: string;
  className: string;
}

const STUDENT_SHEETS: SheetSpec[] = [
  { sheet: 'TPQ 1', levelCode: 'TPQ', classCode: 'TPQ-01', className: 'TPQ I' },
  { sheet: 'TPQ II', levelCode: 'TPQ', classCode: 'TPQ-02', className: 'TPQ II' },
  { sheet: 'I AW', levelCode: 'AW', classCode: 'AW-01', className: 'I Awaliyah' },
  { sheet: 'II AW', levelCode: 'AW', classCode: 'AW-02', className: 'II Awaliyah' },
  { sheet: 'III AW', levelCode: 'AW', classCode: 'AW-03', className: 'III Awaliyah' },
  { sheet: 'IV AW', levelCode: 'AW', classCode: 'AW-04', className: 'IV Awaliyah' },
  { sheet: 'I W', levelCode: 'WU', classCode: 'WU-01', className: 'I Wustha' },
  { sheet: 'II W', levelCode: 'WU', classCode: 'WU-02', className: 'II Wustha' },
  { sheet: 'Ulya I', levelCode: 'UL', classCode: 'UL-01', className: 'I Ulya' },
  { sheet: 'Ulya II', levelCode: 'UL', classCode: 'UL-02', className: 'II Ulya' },
];

const LEVELS = [
  { code: 'TPQ', name: 'TPQ', description: 'Taman Pendidikan Al-Quran', displayOrder: 1 },
  { code: 'AW', name: 'Awaliyah', description: 'Tingkat Awaliyah', displayOrder: 2 },
  { code: 'WU', name: 'Wustha', description: 'Tingkat Wustha', displayOrder: 3 },
  { code: 'UL', name: 'Ulya', description: 'Tingkat Ulya', displayOrder: 4 },
];

const text = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value).trim();

const clean = (value: unknown): string | null => {
  const result = text(value);
  if (!result || result === '-' || result === 'Nihil') return null;
  return result;
};

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === 'number') {
    // Serial tanggal Excel (basis 1899-12-30).
    if (value > 20000 && value < 60000) {
      return new Date(Math.round((value - 25569) * 86400 * 1000));
    }
    if (value >= 1900 && value <= 2100) return new Date(value, 0, 1);
    return null;
  }

  const raw = String(value).trim();
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseGender(value: unknown): Gender {
  const raw = text(value).toLowerCase();
  if (raw.startsWith('p') || raw.includes('perempuan')) return Gender.FEMALE;
  return Gender.MALE;
}

function yearToDate(value: unknown): Date | null {
  const raw = text(value);
  const match = raw.match(/(\d{4})/);
  if (match) return new Date(Number(match[1]), 0, 1);
  const numeric = Number(raw);
  if (numeric >= 1900 && numeric <= 2100) return new Date(numeric, 0, 1);
  return null;
}

function readSheet(workbook: XLSX.WorkBook, sheet: string): Row[] {
  const worksheet = workbook.Sheets[sheet];
  if (!worksheet) throw new Error(`Sheet "${sheet}" tidak ditemukan di workbook`);
  return XLSX.utils.sheet_to_json<Row>(worksheet, { header: 1, defval: '' });
}

function findHeaderRow(rows: Row[], required: string): number {
  return rows.findIndex((row) =>
    row.some((cell) => text(cell).toLowerCase() === required.toLowerCase()),
  );
}

/**
 * Peta nama kolom -> indeks. Nama kolom dinormalisasi agar tahan terhadap
 * perbedaan penulisan (huruf besar/kecil, spasi ganda).
 */
function headerIndex(header: Row): (name: string) => number {
  const normalized = header.map((cell) =>
    text(cell).toLowerCase().replace(/\s+/g, ' ').trim(),
  );
  return (name: string) =>
    normalized.findIndex(
      (cell) => cell === name.toLowerCase() || cell.startsWith(name.toLowerCase()),
    );
}

function normalizeSchoolProfile(workbook: XLSX.WorkBook) {
  return {
    name: 'MADRASAH DINIYAH TAKMILIYAH MIFTAHUL ULUM BERMI',
    nsm: '311233210479',
    npsn: null as string | null,
    address: 'JL. DIPONEGORO DESA BERMI',
    village: 'BERMI',
    district: 'MIJEN',
    regency: 'DEMAK',
    province: 'JAWA TENGAH',
    postalCode: '59583',
    phone: '081326590367',
    email: 'miftahululum.bermi@gmail.com',
    website: null as string | null,
    principalName: 'H. Achmad Shofa, S.Sos., M.AP',
    description:
      'Madrasah Diniyah Takmiliyah Miftahul Ulum Bermi, Mijen, Demak. ' +
      'Berdiri tahun 1976 M (1397 H), menyelenggarakan pendidikan diniyah ' +
      'jenjang TPQ, Awaliyah, Wustha, dan Ulya.',
  };
}

async function importSchoolProfile(workbook: XLSX.WorkBook) {
  const profile = normalizeSchoolProfile(workbook);
  const existing = await prisma.schoolProfile.findFirst();

  if (existing) {
    await prisma.schoolProfile.update({
      where: { id: existing.id },
      data: profile,
    });
  } else {
    await prisma.schoolProfile.create({
      data: { ...profile, isInitialized: true },
    });
  }
  console.log('✅ Profil madrasah diperbarui');
}

async function importEmployees(workbook: XLSX.WorkBook) {
  const sources = [
    { sheet: 'Data ptk', prefix: 'PTK', defaultType: EmployeeType.TEACHER },
    { sheet: 'Tendik', prefix: 'TND', defaultType: EmployeeType.STAFF },
  ];

  let imported = 0;
  let skipped = 0;

  for (const source of sources) {
    const rows = readSheet(workbook, source.sheet);
    const headerRow = findHeaderRow(rows, 'Nama Lengkap');
    if (headerRow === -1) {
      console.log(`⚠️  Sheet "${source.sheet}" tidak punya header yang dikenali`);
      continue;
    }

    const col = headerIndex(rows[headerRow]);
    const iName = col('Nama Lengkap');
    let counter = 0;

    for (let index = headerRow + 1; index < rows.length; index += 1) {
      const row = rows[index];
      const fullName = text(row[iName]);
      if (!fullName || fullName.toLowerCase() === 'nama lengkap') continue;

      counter += 1;
      const employeeNumber = `${source.prefix}-${String(counter).padStart(3, '0')}`;
      const status = text(row[col('Status')]);
      const rawType = status.toLowerCase();
      const employeeType = rawType.includes('kependidikan')
        ? EmployeeType.STAFF
        : rawType.includes('pendidik')
          ? EmployeeType.TEACHER
          : source.defaultType;

      const employmentStatus = clean(row[col('Status Guru')]);
      const activity = text(row[col('Keaktifan')]).toLowerCase();
      const activityStatus = activity.includes('aktif')
        ? ActivityStatus.ACTIVE
        : activity.includes('tidak') || activity.includes('non')
          ? ActivityStatus.INACTIVE
          : ActivityStatus.ACTIVE;

      const data = {
        fullName,
        nik: clean(row[col('NIK')]),
        gender: parseGender(row[col('Jenis Kelamin')]),
        birthPlace: clean(row[col('Tempat Lahir')]),
        birthDate: parseDate(row[col('Tanggal Lahir')]),
        address: clean(row[col('Alamat')]),
        motherName: clean(row[col('Nama Ibu Kandung')]),
        postalCode: clean(row[col('Kode POS')]),
        employmentStatus,
        educationLevel: clean(row[col('Akademik')]),
        subjectArea: clean(row[col('Bidang Studi')]),
        employeeType,
        startDate: yearToDate(row[col('TMT')]),
        activityStatus,
      };

      try {
        const existing = await prisma.employee.findFirst({
          where: {
            OR: [
              { employeeNumber },
              ...(data.nik ? [{ nik: data.nik }] : []),
            ],
          },
          select: { id: true },
        });

        if (existing) {
          await prisma.employee.update({ where: { id: existing.id }, data });
        } else {
          await prisma.employee.create({ data: { employeeNumber, ...data } });
        }
        imported += 1;
      } catch (error) {
        skipped += 1;
        console.warn(
          `⚠️  Lewati pegawai "${fullName}": ${(error as Error).message.split('\n')[0]}`,
        );
      }
    }
  }

  console.log(`✅ Pegawai diimpor: ${imported} (dilewati: ${skipped})`);
}

async function ensureClasses(academicYearId: string) {
  const levelIdByCode = new Map<string, string>();

  for (const level of LEVELS) {
    const record = await prisma.level.upsert({
      where: { code: level.code },
      update: { name: level.name, description: level.description, displayOrder: level.displayOrder },
      create: { ...level, isActive: true },
    });
    levelIdByCode.set(level.code, record.id);
  }

  const classIdByCode = new Map<string, string>();
  for (const spec of STUDENT_SHEETS) {
    const levelId = levelIdByCode.get(spec.levelCode);
    if (!levelId) throw new Error(`Level ${spec.levelCode} tidak tersedia`);

    const record = await prisma.class.upsert({
      where: {
        academicYearId_code: { academicYearId, code: spec.classCode },
      },
      update: { name: spec.className, levelId, isActive: true },
      create: {
        academicYearId,
        levelId,
        code: spec.classCode,
        name: spec.className,
        capacity: 40,
        isActive: true,
      },
    });
    classIdByCode.set(spec.classCode, record.id);
  }

  console.log(`✅ Kelas disiapkan: ${classIdByCode.size + 0}`);
  return classIdByCode;
}

function isDemoStudent(studentNumber: string) {
  return /^STU\d+/i.test(studentNumber);
}

function isDemoEmployee(employeeNumber: string) {
  return /^EMP\d+/i.test(employeeNumber);
}

async function removeDemoData() {
  const demoEmployees = await prisma.employee.findMany({
    where: { employeeNumber: { startsWith: 'EMP' } },
    select: { id: true, employeeNumber: true },
  });
  const ids = demoEmployees
    .filter((employee) => isDemoEmployee(employee.employeeNumber))
    .map((employee) => employee.id);

  if (ids.length > 0) {
    await prisma.class.updateMany({
      where: { homeroomTeacherId: { in: ids } },
      data: { homeroomTeacherId: null },
    });
    await prisma.user.updateMany({
      where: { employeeId: { in: ids } },
      data: { employeeId: null },
    });
    await prisma.teacherSubject.deleteMany({ where: { teacherId: { in: ids } } });
    await prisma.classSubject.deleteMany({ where: { teacherId: { in: ids } } });
    await prisma.schedule.deleteMany({ where: { teacherId: { in: ids } } });
    await prisma.attendanceSession.deleteMany({ where: { teacherId: { in: ids } } });
    await prisma.employee.deleteMany({ where: { id: { in: ids } } });
  }

  const students = await prisma.student.findMany({
    where: { studentNumber: { startsWith: 'STU' } },
    select: { id: true, studentNumber: true },
  });
  const studentIds = students
    .filter((student) => isDemoStudent(student.studentNumber))
    .map((student) => student.id);

  if (studentIds.length > 0) {
    await prisma.ppdbRegistration.updateMany({
      where: { studentId: { in: studentIds } },
      data: { studentId: null },
    });
    await prisma.assessmentScore.deleteMany({
      where: { studentId: { in: studentIds } },
    });
    await prisma.attendanceRecord.deleteMany({
      where: { studentId: { in: studentIds } },
    });
    await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
  }

  console.log(
    `🧹 Data demo dihapus: ${ids.length} pegawai, ${studentIds.length} santri`,
  );
}

async function importStudents(
  workbook: XLSX.WorkBook,
  academicYearId: string,
  academicYearStart: Date,
  classIdByCode: Map<string, string>,
) {
  const usedNumbers = new Set<string>();
  let created = 0;
  let updated = 0;
  let linked = 0;
  let parents = 0;

  for (const spec of STUDENT_SHEETS) {
    const rows = readSheet(workbook, spec.sheet);
    const headerRow = findHeaderRow(rows, 'Nama Santri');
    if (headerRow === -1) {
      console.log(`⚠️  Sheet "${spec.sheet}" tidak punya header yang dikenali`);
      continue;
    }

    const col = headerIndex(rows[headerRow]);
    const iName = col('Nama Santri');
    const iNik = col('NIK');
    const iNis = col('No Induk');
    const iNisn = col('NISN');
    const iGender = col('L/P');
    const iBirthPlace = col('Tempat Lahir');
    const iBirthDate = col('Tanggal Lahir');
    const iAddress = col('Alamat');
    const iFather = col('Ayah');
    const iMother = col('Ibu');
    const iFatherNik = col('NIK Ayah');
    const iMotherNik = col('NIK Ibu');
    const iFatherJob = col('Pekerjaan Ayah');
    const iJob = col('Pekerjaan');
    const iOrtuJob = col('Pekerjaan Ortu');
    const iKk = col('Nomor KK') >= 0 ? col('Nomor KK') : col('No KK');
    const classId = classIdByCode.get(spec.classCode);
    if (!classId) continue;

    for (let index = headerRow + 1; index < rows.length; index += 1) {
      const row = rows[index];
      const fullName = text(row[iName]);
      if (!fullName || fullName.toLowerCase() === 'nama santri') continue;

      const nik = clean(row[iNik]);
      const rawNis = clean(row[iNis]);
      const nisn = clean(row[iNisn]);

      let studentNumber =
        rawNis && !usedNumbers.has(rawNis) ? rawNis : null;
      if (!studentNumber) {
        const base = rawNis || `MD-${spec.classCode}`;
        let candidate = `${base}-${spec.classCode}`;
        let suffix = 2;
        while (usedNumbers.has(candidate)) {
          candidate = `${base}-${spec.classCode}-${suffix}`;
          suffix += 1;
        }
        studentNumber = candidate;
      }
      usedNumbers.add(studentNumber);

      const data = {
        fullName,
        nik,
        nisn,
        gender: parseGender(row[iGender]),
        birthPlace: clean(row[iBirthPlace]),
        birthDate: parseDate(row[iBirthDate]),
        address: clean(row[iAddress]),
        village: 'BERMI',
        district: 'MIJEN',
        regency: 'DEMAK',
        province: 'JAWA TENGAH',
        postalCode: '59583',
        kkNumber: clean(row[iKk]),
      };

      let studentId: string | null = null;

      // Cocokkan lewat NIK agar tidak duplikat meski nomor induk berbeda.
      const existingByNik = nik
        ? await prisma.student.findFirst({
            where: { nik, deletedAt: null },
            select: { id: true, studentNumber: true },
          })
        : null;

      if (existingByNik) {
        studentId = existingByNik.id;
        usedNumbers.add(existingByNik.studentNumber);
        await prisma.student.update({ where: { id: studentId }, data });
        updated += 1;
      } else {
        const createdStudent = await prisma.student.create({
          data: { studentNumber, ...data },
        });
        studentId = createdStudent.id;
        created += 1;
      }

      // Riwayat kelas pada tahun ajaran aktif.
      const existingHistory = await prisma.studentClassHistory.findFirst({
        where: { studentId, classId, academicYearId },
        select: { id: true },
      });
      if (!existingHistory) {
        await prisma.studentClassHistory.create({
          data: {
            studentId,
            classId,
            academicYearId,
            startDate: academicYearStart,
            status: 'ACTIVE',
          },
        });
        linked += 1;
      }

      // Orang tua (ayah & ibu) bila namanya tersedia.
      const parentRows = [
        {
          relationship: 'FATHER' as const,
          name: clean(row[iFather]),
          nik: clean(row[iFatherNik]),
          occupation: clean(row[iFatherJob]) || clean(row[iJob]),
        },
        {
          relationship: 'MOTHER' as const,
          name: clean(row[iMother]),
          nik: clean(row[iMotherNik]),
          occupation: clean(row[iOrtuJob]) || clean(row[iJob]),
        },
      ];

      for (const parent of parentRows) {
        if (!parent.name) continue;
        const exists = await prisma.studentParent.findFirst({
          where: { studentId, relationship: parent.relationship },
          select: { id: true },
        });
        if (exists) {
          await prisma.studentParent.update({
            where: { id: exists.id },
            data: {
              name: parent.name,
              nik: parent.nik,
              occupation: parent.occupation,
            },
          });
        } else {
          await prisma.studentParent.create({
            data: {
              studentId,
              relationship: parent.relationship,
              name: parent.name,
              nik: parent.nik,
              occupation: parent.occupation,
              isPrimary: parent.relationship === 'FATHER',
            },
          });
          parents += 1;
        }
      }
    }

    console.log(`   • ${spec.sheet} -> ${spec.className}`);
  }

  console.log(
    `✅ Santri dibuat: ${created}, diperbarui: ${updated}, riwayat kelas baru: ${linked}, orang tua baru: ${parents}`,
  );
}

async function main() {
  if (!existsSync(WORKBOOK)) {
    throw new Error(`Workbook tidak ditemukan: ${WORKBOOK}`);
  }

  console.log(`📖 Membaca ${WORKBOOK}`);
  const workbook = XLSX.readFile(WORKBOOK);

  if (REPLACE_DEMO) {
    await removeDemoData();
  }

  await importSchoolProfile(workbook);
  await importEmployees(workbook);

  let academicYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
  });

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        name: '2024/2025',
        startDate: new Date(2024, 6, 1),
        endDate: new Date(2025, 5, 30),
        isActive: true,
      },
    });
  }

  const classIdByCode = await ensureClasses(academicYear.id);
  await importStudents(
    workbook,
    academicYear.id,
    academicYear.startDate,
    classIdByCode,
  );

  const [students, employees, classes] = await Promise.all([
    prisma.student.count({ where: { deletedAt: null } }),
    prisma.employee.count({ where: { deletedAt: null } }),
    prisma.class.count({ where: { academicYearId: academicYear.id } }),
  ]);
  console.log(
    `🎉 Selesai. Total: ${students} santri, ${employees} pegawai, ${classes} kelas (TA ${academicYear.name}).`,
  );
}

main()
  .catch((error) => {
    console.error('❌ Impor gagal:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
