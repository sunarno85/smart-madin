# SMART MADIN

## Sistem Informasi Madrasah Diniyah Terpadu

Aplikasi web manajemen administrasi Madrasah Diniyah (single-tenant) untuk **Madrasah Diniyah Takmiliyah Miftahul Ulum Bermi**, Mijen, Demak.

**Repository GitHub (private):** https://github.com/sunarno85/smart-madin.git

Cara instalasi dari GitHub langsung ke komputer: lihat **[INSTALL.md](INSTALL.md)**.

Launcher Windows: `install.cmd` (install semua dependency + database) lalu `run.cmd` (jalankan aplikasi). Cek kesiapan dengan `run.cmd -CheckOnly`.

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (lazy loading + manual chunks)
- Tailwind CSS + shadcn/ui
- React Router + TanStack Query
- React Hook Form + Zod
- Recharts

### Backend
- NestJS (Node.js + TypeScript)
- Prisma ORM + PostgreSQL
- JWT Authentication + RBAC berbasis permission
- Swagger API Docs

### DevOps
- Docker + Docker Compose
- Nginx

## Fitur Utama

- **Autentikasi & RBAC** — JWT access/refresh, permission `module.action` ditegakkan global di API dan juga di rute frontend. Perubahan role/permission langsung berlaku tanpa restart.
- **Audit Log Global** — Selain login & impor, semua mutasi sukses (POST/PATCH/PUT/DELETE) dicatat otomatis; field sensitif (password, token) disembunyikan.
- **Profil Madrasah** — Data identitas, NSDT, alamat, kepala madrasah.
- **Akademik** — Tahun ajaran, jenjang (TPQ, Awaliyah, Wustha, Ulya), kelas, mata pelajaran, jadwal (deteksi bentrok), presensi, penilaian, kenaikan kelas.
- **Santri & Pegawai** — CRUD, soft delete, riwayat kelas, data orang tua, foto, PTK/Tendik.
- **PPDB** — Form pendaftaran publik, cek status, verifikasi admin, konversi ke santri.
- **Laporan** — Dashboard, rapor, leger, statistik santri/PTK, ekspor Excel.
- **Impor Excel** — Normalisasi, validasi, deteksi duplikat.

## Quick Start

```bash
npm install

# Salin & sesuaikan konfigurasi (DATABASE_URL, JWT_SECRET, dll.)
cp .env.example .env

npm run prisma:generate
npm run prisma:migrate
npm run seed                  # hanya akun & permission dasar
npm run sync:permissions      # sinkronkan 100 permission & grant per role (idempotent)

# Opsional: isi data nyata dari Aplikasi Data Madin.xlsx
npm run import:madin -- --replace

npm run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`

Perintah lain:

```bash
npm run build                 # build API + web
npm run test:e2e:api          # 11 test e2e: auth, RBAC, audit log
npm run sync:permissions      # aman dijalankan ulang
npm run import:madin          # impor/perbarui tanpa menghapus data lain
```

## Akun Default (development)

| Username | Role | Password |
|---|---|---|
| `admin` | SUPER_ADMIN (akses penuh) | `admin123` |
| `headmaster` | HEADMASTER (baca data & laporan) | `admin123` |
| `admin2` | ADMIN | tergantung seed/DB |
| `operator1` | OPERATOR | tergantung seed/DB |
| `guru1` | TEACHER | tergantung seed/DB |
| `wali-kelas` | HOMEROOM_TEACHER | tergantung seed/DB |

> Ganti semua password dan JWT secret sebelum dipakai di production. `npm run build` akan menolak `NODE_ENV=production` bila `JWT_SECRET`/`JWT_REFRESH_SECRET` belum aman.

## RBAC

Kebijakan terpusat ada di `prisma/permissions.config.ts` (100 permission untuk 6 role). Guard global membaca permission langsung dari database setiap request:

- `@Public()` — endpoint PPDB publik & login/refresh.
- `@AuthenticatedOnly()` — cukup login (contoh: profil madrasah untuk dibaca).
- `@RequirePermissions('module.action')` — wajib izin tertentu; tanpa dekorator, endpoint ditolak (fail-closed).

SUPER_ADMIN selalu lolos. Frontend memakai permission yang sama untuk menyembunyikan menu dan memblokir rute.

## Data Nyata (`Aplikasi Data Madin.xlsx`)

`npm run import:madin -- --replace` mengisi:

- Profil madrasah (NSDT `311233210479`).
- **21 pegawai** (19 PTK + 2 tendik) dari sheet `Data ptk` & `Tendik`.
- **10 kelas** pada TA 2024/2025.
- **249 santri** + 249 riwayat kelas + 493 data orang tua dari 10 sheet kelas.

Catatan: ringkasan di sheet `Dasbor` menyebut **241 santri**, tetapi 10 sheet kelas memuat 249 baris nama (termasuk santri yang mungkin sudah keluar). Import memakai data per sheet sebagai sumber kebenaran. Dedupe santri memakai NIK agar nomor induk yang bentrok antar sheet tidak membuat duplikat.

Flag `--replace` hanya menghapus data demo berprefiks `STU…`/`EMP…` beserta turunannya; data nyata tidak dihapus. Script idempotent sehingga bisa dijalankan ulang.

## Project Structure

```
smart-madin/
├── apps/
│   ├── web/          # React frontend (lazy routes)
│   └── api/          # NestJS backend (guards + audit interceptor)
├── prisma/
│   ├── schema.prisma
│   ├── permissions.config.ts
│   ├── sync-permissions.ts
│   └── import-madin.ts
├── docker/
└── docs/
```

## Verifikasi Terakhir

- `npm run build:api` ✅
- `npm run build:web` ✅ (bundel awal ~79 kB; halaman dimuat terpisah)
- `npm run test:e2e:api` ✅ 11/11
- Smoke test API langsung ✅ — tanpa token `/students` → 401; admin → 200; headmaster `/users` → 403; `/ppdb/public/years` → 200; audit CREATE/DELETE tercatat.

## License

MIT
