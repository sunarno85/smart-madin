import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

// ============================================================
// Field definitions for each module
// ============================================================

interface FieldDef {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'enum';
  required?: boolean;
  maxLength?: number;
  enumValues?: string[];
  normalize?: (val: any) => any;
}

const STUDENT_FIELDS: FieldDef[] = [
  { key: 'studentNumber', label: 'No Induk', type: 'string' },
  { key: 'nik', label: 'NIK', type: 'string', maxLength: 16 },
  { key: 'nisn', label: 'NISN', type: 'string' },
  { key: 'fullName', label: 'Nama Lengkap', type: 'string', required: true },
  {
    key: 'gender',
    label: 'Jenis Kelamin',
    type: 'enum',
    required: true,
    enumValues: ['MALE', 'FEMALE'],
    normalize: (val: any) => {
      const s = String(val || '').trim().toUpperCase();
      if (['L', 'LAKI-LAKI', 'LAKI', 'MALE', 'M'].includes(s)) return 'MALE';
      if (['P', 'PEREMPUAN', 'FEMALE', 'F'].includes(s)) return 'FEMALE';
      return null;
    },
  },
  { key: 'birthPlace', label: 'Tempat Lahir', type: 'string' },
  { key: 'birthDate', label: 'Tanggal Lahir', type: 'date' },
  { key: 'address', label: 'Alamat', type: 'string' },
  { key: 'village', label: 'Desa/Kelurahan', type: 'string' },
  { key: 'district', label: 'Kecamatan', type: 'string' },
  { key: 'regency', label: 'Kabupaten', type: 'string' },
  { key: 'province', label: 'Provinsi', type: 'string' },
  { key: 'postalCode', label: 'Kode Pos', type: 'string' },
  { key: 'kkNumber', label: 'No KK', type: 'string' },
  { key: 'guardianName', label: 'Nama Wali', type: 'string' },
  { key: 'guardianPhone', label: 'Telepon Wali', type: 'string' },
  { key: 'fatherName', label: 'Nama Ayah', type: 'string' },
  { key: 'fatherNik', label: 'NIK Ayah', type: 'string' },
  { key: 'fatherPhone', label: 'Telepon Ayah', type: 'string' },
  { key: 'fatherOccupation', label: 'Pekerjaan Ayah', type: 'string' },
  { key: 'motherName', label: 'Nama Ibu', type: 'string' },
  { key: 'motherNik', label: 'NIK Ibu', type: 'string' },
  { key: 'motherPhone', label: 'Telepon Ibu', type: 'string' },
  { key: 'motherOccupation', label: 'Pekerjaan Ibu', type: 'string' },
];

const EMPLOYEE_FIELDS: FieldDef[] = [
  { key: 'employeeNumber', label: 'No Induk', type: 'string' },
  { key: 'nik', label: 'NIK', type: 'string', maxLength: 16 },
  { key: 'fullName', label: 'Nama Lengkap', type: 'string', required: true },
  {
    key: 'gender',
    label: 'Jenis Kelamin',
    type: 'enum',
    required: true,
    enumValues: ['MALE', 'FEMALE'],
    normalize: (val: any) => {
      const s = String(val || '').trim().toUpperCase();
      if (['L', 'LAKI-LAKI', 'LAKI', 'MALE', 'M'].includes(s)) return 'MALE';
      if (['P', 'PEREMPUAN', 'FEMALE', 'F'].includes(s)) return 'FEMALE';
      return null;
    },
  },
  { key: 'birthPlace', label: 'Tempat Lahir', type: 'string' },
  { key: 'birthDate', label: 'Tanggal Lahir', type: 'date' },
  { key: 'address', label: 'Alamat', type: 'string' },
  { key: 'motherName', label: 'Nama Ibu', type: 'string' },
  { key: 'postalCode', label: 'Kode Pos', type: 'string' },
  { key: 'employmentStatus', label: 'Status Kepegawaian', type: 'string' },
  { key: 'educationLevel', label: 'Pendidikan', type: 'string' },
  { key: 'subjectArea', label: 'Bidang Keahlian', type: 'string' },
  {
    key: 'employeeType',
    label: 'Tipe Pegawai',
    type: 'enum',
    required: true,
    enumValues: ['TEACHER', 'STAFF'],
    normalize: (val: any) => {
      const s = String(val || '').trim().toUpperCase();
      if (['GURU', 'PTK', 'TEACHER'].includes(s)) return 'TEACHER';
      if (['TENDIK', 'STAFF', 'TENAGA PENDIDIK'].includes(s)) return 'STAFF';
      return null;
    },
  },
  {
    key: 'activityStatus',
    label: 'Status Aktivitas',
    type: 'enum',
    enumValues: ['ACTIVE', 'INACTIVE', 'RETIRED', 'RESIGNED'],
    normalize: (val: any) => {
      const s = String(val || '').trim().toUpperCase();
      const map: Record<string, string> = {
        'AKTIF': 'ACTIVE', 'ACTIVE': 'ACTIVE',
        'TIDAK AKTIF': 'INACTIVE', 'INACTIVE': 'INACTIVE', 'NONAKTIF': 'INACTIVE',
        'PENSIUN': 'RETIRED', 'RETIRED': 'RETIRED',
        'MENGUNDURKAN DIRI': 'RESIGNED', 'RESIGNED': 'RESIGNED',
      };
      return map[s] || null;
    },
  },
  { key: 'phone', label: 'Telepon', type: 'string' },
  { key: 'email', label: 'Email', type: 'string' },
];

export const MODULE_FIELDS: Record<string, FieldDef[]> = {
  students: STUDENT_FIELDS,
  employees: EMPLOYEE_FIELDS,
};

// Common Excel column name → field key auto-mapping hints
const COLUMN_HINTS: Record<string, string[]> = {
  fullName: ['nama lengkap', 'nama', 'full name', 'nama santri', 'nama pegawai', 'nama guru', 'nama ptk'],
  nik: ['nik', 'no ktp', 'noktp', 'nomor ktp'],
  nisn: ['nisn', 'no induk siswa', 'nomor induk siswa'],
  studentNumber: ['no induk', 'nomor induk', 'no. induk', 'nomor induk santri', 'no induk santri', 'no registrasi'],
  gender: ['jenis kelamin', 'jk', 'kelamin', 'sex'],
  birthPlace: ['tempat lahir', 'tempat_lahir', 'tmplahir'],
  birthDate: ['tanggal lahir', 'tgl_lahir', 'tgllahir', 'date of birth', 'dob'],
  address: ['alamat', 'address'],
  village: ['desa', 'kelurahan', 'desa/kelurahan'],
  district: ['kecamatan', 'kec'],
  regency: ['kabupaten', 'kab'],
  province: ['provinsi', 'prov'],
  fatherName: ['nama ayah', 'ayah', 'nama bapak', 'bapak'],
  motherName: ['nama ibu', 'ibu', 'nama bunda'],
  employeeNumber: ['no induk', 'nomor induk', 'no. induk', 'no induk pegawai', 'nip'],
  employeeType: ['tipe', 'type', 'jenis pegawai', 'kategori', 'guru/tendik', 'ptk/tendik'],
  activityStatus: ['status', 'status aktivitas', 'status keaktifan'],
  phone: ['telepon', 'hp', 'handphone', 'telp', 'no hp', 'no telp'],
  email: ['email', 'e-mail', 'surel'],
  educationLevel: ['pendidikan', 'pendidikan terakhir', 'education'],
  subjectArea: ['bidang', 'bidang keahlian', 'mapel', 'mata pelajaran'],
  employmentStatus: ['status kepegawaian', 'status pegawai'],
};

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // Step 1: Upload & Parse workbook
  // ============================================================
  async parseWorkbook(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File tidak ditemukan');

    const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });

    const sheets = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      const rowCount = range.e.r + 1;
      const colCount = range.e.c + 1;

      // Read first row as headers
      const headers: string[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
        headers.push(cell ? String(cell.v).trim() : `Column ${c + 1}`);
      }

      return { name: name, rowCount: rowCount - 1, colCount, headers };
    });

    return {
      filename: file.originalname,
      sheets,
    };
  }

  // ============================================================
  // Step 2: Auto-detect column mapping
  // ============================================================
  autoMapColumns(headers: string[], module: string): Record<string, string> {
    const fields = MODULE_FIELDS[module];
    if (!fields) throw new BadRequestException(`Modul "${module}" tidak didukung`);

    const mapping: Record<string, string> = {};

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();

      for (const field of fields) {
        // Check exact match
        if (normalizedHeader === field.label.toLowerCase()) {
          mapping[header] = field.key;
          break;
        }

        // Check hints
        const hints = COLUMN_HINTS[field.key] || [];
        for (const hint of hints) {
          if (normalizedHeader.includes(hint) || hint.includes(normalizedHeader)) {
            if (!Object.values(mapping).includes(field.key)) {
              mapping[header] = field.key;
              break;
            }
          }
        }
      }
    }

    return mapping;
  }

  // ============================================================
  // Step 3: Create import job and preview
  // ============================================================
  async createImportJob(
    file: Express.Multer.File,
    sheetName: string,
    module: string,
    userId: string,
  ) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new BadRequestException(`Sheet "${sheetName}" tidak ditemukan`);

    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (rawData.length === 0) throw new BadRequestException('Sheet kosong');

    const headers = Object.keys(rawData[0] as object);

    // Auto-map columns
    const autoMapping = this.autoMapColumns(headers, module);

    // Create import job
    const job = await this.prisma.importJob.create({
      data: {
        filename: file.originalname,
        sheetName,
        module,
        totalRows: rawData.length,
        status: 'PENDING',
        createdBy: userId,
      },
    });

    return {
      jobId: job.id,
      filename: file.originalname,
      sheetName,
      module,
      totalRows: rawData.length,
      headers,
      autoMapping,
      fields: (MODULE_FIELDS[module] || []).map((f) => ({
        key: f.key,
        label: f.label,
        required: f.required || false,
      })),
    };
  }

  // ============================================================
  // Step 4: Preview with mapping applied
  // ============================================================
  async previewData(
    file: Express.Multer.File,
    sheetName: string,
    module: string,
    columnMapping: Record<string, string>,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const fields = MODULE_FIELDS[module];
    if (!fields) throw new BadRequestException(`Modul "${module}" tidak didukung`);

    const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new BadRequestException(`Sheet "${sheetName}" tidak ditemukan`);

    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Map and validate rows
    const results = rawData.map((row: any, index: number) => {
      const mapped: any = {};
      const errors: string[] = [];
      const warnings: string[] = [];

      for (const [excelCol, fieldKey] of Object.entries(columnMapping)) {
        if (!fieldKey) continue;
        const fieldDef = fields.find((f) => f.key === fieldKey);
        if (!fieldDef) continue;

        let value = row[excelCol];

        // Normalize
        if (fieldDef.normalize) {
          value = fieldDef.normalize(value);
          if (value === null || value === undefined || value === '') {
            if (fieldDef.required) {
              errors.push(`${fieldDef.label} wajib diisi`);
            }
            continue;
          }
        }

        // Type conversion
        if (fieldDef.type === 'date' && value) {
          value = this.normalizeDate(value);
        }

        if (fieldDef.type === 'string' && value !== null && value !== undefined) {
          value = this.normalizeString(String(value));
        }

        // Validation
        if (fieldDef.required && (!value || value === '')) {
          errors.push(`${fieldDef.label} wajib diisi`);
        }

        if (fieldDef.maxLength && String(value).length > fieldDef.maxLength) {
          errors.push(`${fieldDef.label} maksimal ${fieldDef.maxLength} karakter`);
        }

        if (fieldDef.type === 'enum' && value && !fieldDef.enumValues?.includes(value)) {
          errors.push(`${fieldDef.label} harus salah satu dari: ${fieldDef.enumValues?.join(', ')}`);
        }

        mapped[fieldKey] = value;
      }

      // Validate required fields
      for (const fieldDef of fields) {
        if (fieldDef.required && (!mapped[fieldDef.key] || mapped[fieldDef.key] === '')) {
          const hasError = errors.some((e) => e.startsWith(fieldDef.label));
          if (!hasError) {
            errors.push(`${fieldDef.label} wajib diisi`);
          }
        }
      }

      return {
        rowNumber: index + 2, // +2 because Excel is 1-indexed + header row
        data: mapped,
        errors,
        warnings,
        isValid: errors.length === 0,
      };
    });

    const totalValid = results.filter((r) => r.isValid).length;
    const totalInvalid = results.filter((r) => !r.isValid).length;

    const start = (page - 1) * pageSize;
    const paginatedData = results.slice(start, start + pageSize);

    return {
      data: paginatedData,
      meta: {
        page,
        pageSize,
        total: results.length,
        totalValid,
        totalInvalid,
        totalPages: Math.ceil(results.length / pageSize),
      },
    };
  }

  // ============================================================
  // Step 5: Detect duplicates
  // ============================================================
  async detectDuplicates(
    file: Express.Multer.File,
    sheetName: string,
    module: string,
    columnMapping: Record<string, string>,
  ) {
    const fields = MODULE_FIELDS[module];
    if (!fields) throw new BadRequestException(`Modul "${module}" tidak didukung`);

    const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Map all data
    const mappedData = rawData.map((row: any) => {
      const mapped: any = {};
      for (const [excelCol, fieldKey] of Object.entries(columnMapping)) {
        if (!fieldKey) continue;
        const fieldDef = fields.find((f) => f.key === fieldKey);
        if (!fieldDef) continue;
        let value = row[excelCol];
        if (fieldDef.normalize) value = fieldDef.normalize(value);
        if (fieldDef.type === 'date' && value) value = this.normalizeDate(value);
        if (fieldDef.type === 'string' && value) value = this.normalizeString(String(value));
        mapped[fieldKey] = value;
      }
      return mapped;
    });

    // Detect duplicates within the file
    const internalDuplicates: { row: number; field: string; value: string }[] = [];
    const seenNik = new Map<string, number>();
    const seenNisn = new Map<string, number>();
    const seenNumber = new Map<string, number>();

    for (let i = 0; i < mappedData.length; i++) {
      const row = mappedData[i];
      const rowNum = i + 2;

      if (row.nik) {
        if (seenNik.has(row.nik)) {
          internalDuplicates.push({ row: rowNum, field: 'NIK', value: row.nik });
        }
        seenNik.set(row.nik, rowNum);
      }
      if (row.nisn) {
        if (seenNisn.has(row.nisn)) {
          internalDuplicates.push({ row: rowNum, field: 'NISN', value: row.nisn });
        }
        seenNisn.set(row.nisn, rowNum);
      }
      if (row.studentNumber || row.employeeNumber) {
        const num = row.studentNumber || row.employeeNumber;
        if (seenNumber.has(num)) {
          internalDuplicates.push({ row: rowNum, field: 'No Induk', value: num });
        }
        seenNumber.set(num, rowNum);
      }
    }

    // Detect duplicates against database
    const dbDuplicates: { row: number; field: string; value: string; existingId: string }[] = [];

    if (module === 'students') {
      const niks = mappedData.filter((r) => r.nik).map((r) => r.nik);
      const nisns = mappedData.filter((r) => r.nisn).map((r) => r.nisn);
      const numbers = mappedData.filter((r) => r.studentNumber).map((r) => r.studentNumber);

      if (niks.length > 0) {
        const existing = await this.prisma.student.findMany({
          where: { nik: { in: niks }, deletedAt: null },
          select: { id: true, nik: true },
        });
        const existingMap = new Map(existing.map((e) => [e.nik, e.id]));
        for (let i = 0; i < mappedData.length; i++) {
          if (mappedData[i].nik && existingMap.has(mappedData[i].nik)) {
            dbDuplicates.push({
              row: i + 2,
              field: 'NIK',
              value: mappedData[i].nik,
              existingId: existingMap.get(mappedData[i].nik)!,
            });
          }
        }
      }

      if (nisns.length > 0) {
        const existing = await this.prisma.student.findMany({
          where: { nisn: { in: nisns }, deletedAt: null },
          select: { id: true, nisn: true },
        });
        const existingMap = new Map(existing.map((e) => [e.nisn!, e.id]));
        for (let i = 0; i < mappedData.length; i++) {
          if (mappedData[i].nisn && existingMap.has(mappedData[i].nisn)) {
            dbDuplicates.push({
              row: i + 2,
              field: 'NISN',
              value: mappedData[i].nisn,
              existingId: existingMap.get(mappedData[i].nisn)!,
            });
          }
        }
      }

      if (numbers.length > 0) {
        const existing = await this.prisma.student.findMany({
          where: { studentNumber: { in: numbers } },
          select: { id: true, studentNumber: true },
        });
        const existingMap = new Map(existing.map((e) => [e.studentNumber, e.id]));
        for (let i = 0; i < mappedData.length; i++) {
          const num = mappedData[i].studentNumber;
          if (num && existingMap.has(num)) {
            dbDuplicates.push({
              row: i + 2,
              field: 'No Induk',
              value: num,
              existingId: existingMap.get(num)!,
            });
          }
        }
      }
    }

    if (module === 'employees') {
      const niks = mappedData.filter((r) => r.nik).map((r) => r.nik);
      const numbers = mappedData.filter((r) => r.employeeNumber).map((r) => r.employeeNumber);

      if (niks.length > 0) {
        const existing = await this.prisma.employee.findMany({
          where: { nik: { in: niks }, deletedAt: null },
          select: { id: true, nik: true },
        });
        const existingMap = new Map(existing.map((e) => [e.nik, e.id]));
        for (let i = 0; i < mappedData.length; i++) {
          if (mappedData[i].nik && existingMap.has(mappedData[i].nik)) {
            dbDuplicates.push({
              row: i + 2,
              field: 'NIK',
              value: mappedData[i].nik,
              existingId: existingMap.get(mappedData[i].nik)!,
            });
          }
        }
      }

      if (numbers.length > 0) {
        const existing = await this.prisma.employee.findMany({
          where: { employeeNumber: { in: numbers } },
          select: { id: true, employeeNumber: true },
        });
        const existingMap = new Map(existing.map((e) => [e.employeeNumber, e.id]));
        for (let i = 0; i < mappedData.length; i++) {
          const num = mappedData[i].employeeNumber;
          if (num && existingMap.has(num)) {
            dbDuplicates.push({
              row: i + 2,
              field: 'No Induk',
              value: num,
              existingId: existingMap.get(num)!,
            });
          }
        }
      }
    }

    return {
      internalDuplicates,
      dbDuplicates,
      totalInternalDuplicates: internalDuplicates.length,
      totalDbDuplicates: dbDuplicates.length,
    };
  }

  // ============================================================
  // Step 6: Execute import
  // ============================================================
  async executeImport(
    file: Express.Multer.File,
    sheetName: string,
    module: string,
    columnMapping: Record<string, string>,
    mode: 'SKIP' | 'INSERT' | 'UPDATE',
    userId: string,
    academicYearId?: string,
  ) {
    const fields = MODULE_FIELDS[module];
    if (!fields) throw new BadRequestException(`Modul "${module}" tidak didukung`);

    const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Map all data
    const mappedData = rawData.map((row: any) => {
      const mapped: any = {};
      for (const [excelCol, fieldKey] of Object.entries(columnMapping)) {
        if (!fieldKey) continue;
        const fieldDef = fields.find((f) => f.key === fieldKey);
        if (!fieldDef) continue;
        let value = row[excelCol];
        if (fieldDef.normalize) value = fieldDef.normalize(value);
        if (fieldDef.type === 'date' && value) value = this.normalizeDate(value);
        if (fieldDef.type === 'string' && value) value = this.normalizeString(String(value));
        mapped[fieldKey] = value;
      }
      return mapped;
    });

    // Create import job record
    const job = await this.prisma.importJob.create({
      data: {
        filename: file.originalname,
        sheetName,
        module,
        totalRows: mappedData.length,
        status: 'PROCESSING',
        createdBy: userId,
        academicYearId,
      },
    });

    let successRows = 0;
    let failedRows = 0;
    const errors: any[] = [];

    try {
      for (let i = 0; i < mappedData.length; i++) {
        const row = mappedData[i];
        const rowNum = i + 2;

        try {
          // Validate required fields
          for (const fieldDef of fields) {
            if (fieldDef.required && (!row[fieldDef.key] || row[fieldDef.key] === '')) {
              throw new Error(`${fieldDef.label} wajib diisi`);
            }
          }

          if (module === 'students') {
            await this.importStudent(row, mode);
          } else if (module === 'employees') {
            await this.importEmployee(row, mode);
          }

          successRows++;
        } catch (err: any) {
          failedRows++;
          errors.push({ row: rowNum, message: err.message || 'Gagal mengimpor baris' });
        }
      }

      // Update job
      await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          successRows,
          failedRows,
          errors: errors.length > 0 ? errors : undefined,
          completedAt: new Date(),
        },
      });

      // Log the import
      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'IMPORT',
          module,
          description: `Import ${module}: ${successRows} berhasil, ${failedRows} gagal dari ${mappedData.length} baris`,
          newData: { jobId: job.id, successRows, failedRows },
        },
      });

      return {
        jobId: job.id,
        status: 'COMPLETED',
        totalRows: mappedData.length,
        successRows,
        failedRows,
        errors: errors.slice(0, 50), // Limit errors returned
      };
    } catch (err) {
      await this.prisma.importJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', completedAt: new Date() },
      });
      throw err;
    }
  }

  // ============================================================
  // Student import
  // ============================================================
  private async importStudent(row: any, mode: 'SKIP' | 'INSERT' | 'UPDATE') {
    // Find existing by NIK, NISN, or studentNumber
    let existing: any = null;

    if (row.nik) {
      existing = await this.prisma.student.findFirst({
        where: { nik: row.nik, deletedAt: null },
      });
    }
    if (!existing && row.nisn) {
      existing = await this.prisma.student.findFirst({
        where: { nisn: row.nisn, deletedAt: null },
      });
    }
    if (!existing && row.studentNumber) {
      existing = await this.prisma.student.findFirst({
        where: { studentNumber: row.studentNumber },
      });
    }

    if (existing && mode === 'SKIP') return;
    if (existing && mode === 'UPDATE') {
      await this.prisma.student.update({
        where: { id: existing.id },
        data: {
          ...(row.nik && { nik: row.nik }),
          ...(row.nisn && { nisn: row.nisn }),
          ...(row.fullName && { fullName: row.fullName }),
          ...(row.gender && { gender: row.gender }),
          ...(row.birthPlace && { birthPlace: row.birthPlace }),
          ...(row.birthDate && { birthDate: new Date(row.birthDate) }),
          ...(row.address && { address: row.address }),
          ...(row.village && { village: row.village }),
          ...(row.district && { district: row.district }),
          ...(row.regency && { regency: row.regency }),
          ...(row.province && { province: row.province }),
          ...(row.postalCode && { postalCode: row.postalCode }),
          ...(row.kkNumber && { kkNumber: row.kkNumber }),
          ...(row.guardianName && { guardianName: row.guardianName }),
          ...(row.guardianPhone && { guardianPhone: row.guardianPhone }),
        },
      });

      // Update parents if present
      if (row.fatherName) {
        const father = await this.prisma.studentParent.findFirst({
          where: { studentId: existing.id, relationship: 'FATHER' },
        });
        if (father) {
          await this.prisma.studentParent.update({
            where: { id: father.id },
            data: { name: row.fatherName, nik: row.fatherNik, phone: row.fatherPhone, occupation: row.fatherOccupation },
          });
        } else {
          await this.prisma.studentParent.create({
            data: { studentId: existing.id, relationship: 'FATHER', name: row.fatherName, nik: row.fatherNik, phone: row.fatherPhone, occupation: row.fatherOccupation, isPrimary: true },
          });
        }
      }
      if (row.motherName) {
        const mother = await this.prisma.studentParent.findFirst({
          where: { studentId: existing.id, relationship: 'MOTHER' },
        });
        if (mother) {
          await this.prisma.studentParent.update({
            where: { id: mother.id },
            data: { name: row.motherName, nik: row.motherNik, phone: row.motherPhone, occupation: row.motherOccupation },
          });
        } else {
          await this.prisma.studentParent.create({
            data: { studentId: existing.id, relationship: 'MOTHER', name: row.motherName, nik: row.motherNik, phone: row.motherPhone, occupation: row.motherOccupation, isPrimary: !row.fatherName },
          });
        }
      }
      return;
    }

    // Generate student number if not provided
    let studentNumber = row.studentNumber;
    if (!studentNumber) {
      const count = await this.prisma.student.count({ where: { deletedAt: null } });
      studentNumber = `STU${String(count + 1).padStart(5, '0')}`;
    }

    // Create student
    const student = await this.prisma.student.create({
      data: {
        studentNumber,
        nik: row.nik || null,
        nisn: row.nisn || null,
        fullName: row.fullName,
        gender: row.gender || 'MALE',
        birthPlace: row.birthPlace || null,
        birthDate: row.birthDate ? new Date(row.birthDate) : null,
        address: row.address || null,
        village: row.village || null,
        district: row.district || null,
        regency: row.regency || null,
        province: row.province || null,
        postalCode: row.postalCode || null,
        kkNumber: row.kkNumber || null,
        guardianName: row.guardianName || null,
        guardianPhone: row.guardianPhone || null,
        status: 'ACTIVE',
      },
    });

    // Create parents
    if (row.fatherName) {
      await this.prisma.studentParent.create({
        data: { studentId: student.id, relationship: 'FATHER', name: row.fatherName, nik: row.fatherNik, phone: row.fatherPhone, occupation: row.fatherOccupation, isPrimary: true },
      });
    }
    if (row.motherName) {
      await this.prisma.studentParent.create({
        data: { studentId: student.id, relationship: 'MOTHER', name: row.motherName, nik: row.motherNik, phone: row.motherPhone, occupation: row.motherOccupation, isPrimary: !row.fatherName },
      });
    }
  }

  // ============================================================
  // Employee import
  // ============================================================
  private async importEmployee(row: any, mode: 'SKIP' | 'INSERT' | 'UPDATE') {
    let existing: any = null;

    if (row.nik) {
      existing = await this.prisma.employee.findFirst({
        where: { nik: row.nik, deletedAt: null },
      });
    }
    if (!existing && row.employeeNumber) {
      existing = await this.prisma.employee.findFirst({
        where: { employeeNumber: row.employeeNumber },
      });
    }

    if (existing && mode === 'SKIP') return;
    if (existing && mode === 'UPDATE') {
      await this.prisma.employee.update({
        where: { id: existing.id },
        data: {
          ...(row.nik && { nik: row.nik }),
          ...(row.fullName && { fullName: row.fullName }),
          ...(row.gender && { gender: row.gender }),
          ...(row.birthPlace && { birthPlace: row.birthPlace }),
          ...(row.birthDate && { birthDate: new Date(row.birthDate) }),
          ...(row.address && { address: row.address }),
          ...(row.motherName && { motherName: row.motherName }),
          ...(row.postalCode && { postalCode: row.postalCode }),
          ...(row.employmentStatus && { employmentStatus: row.employmentStatus }),
          ...(row.educationLevel && { educationLevel: row.educationLevel }),
          ...(row.subjectArea && { subjectArea: row.subjectArea }),
          ...(row.employeeType && { employeeType: row.employeeType }),
          ...(row.activityStatus && { activityStatus: row.activityStatus }),
          ...(row.phone && { phone: row.phone }),
          ...(row.email && { email: row.email }),
        },
      });
      return;
    }

    // Generate employee number if not provided
    let employeeNumber = row.employeeNumber;
    if (!employeeNumber) {
      const count = await this.prisma.employee.count({ where: { deletedAt: null } });
      employeeNumber = `EMP${String(count + 1).padStart(5, '0')}`;
    }

    await this.prisma.employee.create({
      data: {
        employeeNumber,
        nik: row.nik || null,
        fullName: row.fullName,
        gender: row.gender || 'MALE',
        birthPlace: row.birthPlace || null,
        birthDate: row.birthDate ? new Date(row.birthDate) : null,
        address: row.address || null,
        motherName: row.motherName || null,
        postalCode: row.postalCode || null,
        employmentStatus: row.employmentStatus || null,
        educationLevel: row.educationLevel || null,
        subjectArea: row.subjectArea || null,
        employeeType: row.employeeType || 'TEACHER',
        activityStatus: row.activityStatus || 'ACTIVE',
        phone: row.phone || null,
        email: row.email || null,
      },
    });
  }

  // ============================================================
  // Helpers
  // ============================================================
  private normalizeDate(value: any): string | null {
    if (!value) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value.toISOString();
    }
    if (typeof value === 'number') {
      // Excel serial date
      const date = new Date((value - 25569) * 86400 * 1000);
      return isNaN(date.getTime()) ? null : date.toISOString();
    }
    const date = new Date(String(value));
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  private normalizeString(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  async getImportJobs(module?: string) {
    const where = module ? { module } : {};
    return this.prisma.importJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getImportJob(id: string) {
    const job = await this.prisma.importJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Import job tidak ditemukan');
    return job;
  }
}
