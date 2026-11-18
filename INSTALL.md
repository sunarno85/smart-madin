# Instalasi SMART MADIN dari GitHub

Panduan ini untuk memasang aplikasi di komputer Anda langsung dari repository GitHub:

**`https://github.com/sunarno85/smart-madin.git`** (private repository).

## 1. Prasyarat

Pasang dulu:

| Kebutuhan | Versi disarankan | Catatan |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org (pilih LTS). npm sudah termasuk. |
| Git | terbaru | https://git-scm.com/download/win |
| PostgreSQL | 14 ke atas | https://www.postgresql.org/download/windows/ |
| Akun GitHub | `sunarno85` | Diperlukan karena repo bersifat **private**. |

Saat install PostgreSQL, simpan password user `postgres`. Kita akan membuat user + database khusus aplikasi.

> Karena repo private, `git clone` akan meminta login GitHub. Gunakan Git Credential Manager saat diminta, atau Personal Access Token (PAT) sebagai password. PAT perlu scope `repo`.

## 2. Clone repository

Buka **PowerShell** / **Git Bash**, lalu:

```bash
cd $HOME
git clone https://github.com/sunarno85/smart-madin.git
cd smart-madin
```

Jika diminta kredensial GitHub:

- Username: `sunarno85`
- Password: PAT GitHub Anda (bukan password akun)

## 3. Siapkan PostgreSQL

Buka `pgAdmin` atau `psql`, lalu jalankan:

```sql
CREATE USER smartmadin WITH PASSWORD 'smartmadin';
CREATE DATABASE smartmadin OWNER smartmadin;
```

> Boleh memakai user/password lain. Pastikan `DATABASE_URL` di `.env` disesuaikan.

## 4. Konfigurasi environment

```bash
# PowerShell
copy .env.example .env
notepad .env
```

Pastikan nilai ini sesuai dengan PostgreSQL Anda:

```env
DATABASE_URL="postgresql://smartmadin:smartmadin@localhost:5432/smartmadin?schema=public"
JWT_SECRET=ganti-dengan-secret-acak-minimal-32-karakter
JWT_REFRESH_SECRET=ganti-dengan-secret-acak-lain-minimal-32-karakter
APP_URL=http://localhost:5173
API_PORT=3000
```

## 5. Install dependensi & database

Masih di folder `smart-madin`:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run seed
npm run sync:permissions
```

Penjelasan singkat:

- `prisma:generate` — membuat Prisma Client.
- `prisma:migrate` — membuat tabel di database.
- `seed` — membuat akun awal & data dasar.
- `sync:permissions` — sinkronkan 100 permission dan hak akses tiap role (aman dijalankan ulang).

## 6. Isi data nyata madrasah (opsional, disarankan)

File `Aplikasi Data Madin.xlsx` sudah disertakan di repo. Untuk mengisi profil madrasah, 21 pegawai, 10 kelas, dan 249 santri:

```bash
npm run import:madin -- --replace
```

Flag `--replace` hanya menghapus data demo berprefiks `STU…` / `EMP…`, bukan data nyata. Script ini idempotent, jadi boleh dijalankan ulang.

Jika ingin memakai file Excel Anda sendiri:

```bash
npm run import:madin -- --replace --file="C:\Path\Ke\Data.xlsx"
```

## 7. Jalankan aplikasi

```bash
npm run dev
```

Buka di browser:

- Web: http://localhost:5173
- API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs

### Akun awal

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | SUPER_ADMIN |
| `headmaster` | `admin123` | HEADMASTER |

## 8. Verifikasi instalasi

```bash
npm run build
npm run test:e2e:api
```

`test:e2e:api` seharusnya menampilkan **11 passed**.

Atau cek cepat lewat browser:

- Tanpa login, buka `http://localhost:3000/api/students` → harus **401**.
- Buka `http://localhost:3000/api/ppdb/public/years` → harus **200**.
- Setelah login sebagai `admin`, dashboard harus menampilkan 249 santri bila impor data sudah dijalankan.

## 9. Update aplikasi dari GitHub

```bash
cd $HOME\smart-madin
git pull origin main
npm install
npm run prisma:generate
npm run prisma:migrate
npm run sync:permissions
npm run dev
```

## Troubleshooting

| Masalah | Solusi |
|---|---|
| `git clone` diminta login terus | Gunakan PAT sebagai password, atau jalankan `git config --global credential.helper manager` lalu ulangi. |
| `Can't reach database server` | Pastikan PostgreSQL berjalan dan `DATABASE_URL` di `.env` benar. |
| `Environment variable wajib belum diisi` | Isi `JWT_SECRET` & `JWT_REFRESH_SECRET` di `.env`. |
| Port 3000/5173 sudah dipakai | Tutup aplikasi lama, atau ubah `API_PORT` / `WEB_PORT` di `.env`. |
| Akses halaman kosong | Jalankan `npm run build` lalu periksa terminal `npm run dev` untuk error. |

Untuk production, jangan pakai password default dan JWT secret default.
