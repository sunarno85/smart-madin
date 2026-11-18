import {
  Info,
  Mail,
  MessageCircle,
  Phone,
  User,
  GraduationCap,
  ShieldCheck,
  Code2,
  Building2,
  CheckCircle2,
  ExternalLink,
  Heart,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const features = [
  'Manajemen data santri, pegawai, kelas, dan tahun ajaran',
  'Presensi, penilaian, rapor, dan kenaikan kelas',
  'PPDB online dengan verifikasi dan konversi ke santri',
  'Hak akses berbasis permission (RBAC) dan audit log',
  'Impor data Excel serta laporan dan ekspor data',
];

const technologies = [
  'React',
  'TypeScript',
  'Vite',
  'Tailwind CSS',
  'NestJS',
  'Prisma',
  'PostgreSQL',
];

export function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── Header ── */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap size={34} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">SMART MADIN</h1>
              <span className="rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Versi 1.0.0
              </span>
            </div>
            <p className="mt-1 font-medium text-primary">Sistem Informasi Madrasah Diniyah Terpadu</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Aplikasi web manajemen administrasi Madrasah Diniyah yang memudahkan pengelolaan data
              santri, pegawai, akademik, presensi, penilaian, PPDB, hingga pelaporan dalam satu sistem
              yang terintegrasi dan aman.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Tentang aplikasi ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info size={18} className="text-primary" />
              Tentang Aplikasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
              <Building2 size={20} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Madrasah Diniyah Takmiliyah Miftahul Ulum Bermi</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin size={13} /> Mijen, Demak, Jawa Tengah
                </p>
                <p className="mt-1 text-xs text-muted-foreground">NSDT: 311233210479</p>
              </div>
            </div>
            <ul className="space-y-2.5">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Code2 size={14} /> Teknologi yang digunakan
              </p>
              <div className="flex flex-wrap gap-1.5">
                {technologies.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Pembuat ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User size={18} className="text-primary" />
              Tentang Pembuat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                S
              </div>
              <div>
                <p className="text-lg font-semibold">Sunarno</p>
                <p className="text-sm text-muted-foreground">Pengembang SMART MADIN</p>
              </div>
            </div>

            <div className="space-y-3">
              <a
                href="https://wa.me/6285729158209"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <MessageCircle size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">WhatsApp</span>
                  <span className="block truncate text-sm font-medium">0857-2915-8209</span>
                </span>
                <ExternalLink size={15} className="text-muted-foreground" />
              </a>

              <a
                href="mailto:vickazy@gmail.com"
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Mail size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">Email</span>
                  <span className="block truncate text-sm font-medium">vickazy@gmail.com</span>
                </span>
                <ExternalLink size={15} className="text-muted-foreground" />
              </a>

              <div className="flex items-center gap-3 rounded-lg border p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Phone size={18} />
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">No. WhatsApp</span>
                  <span className="block text-sm font-medium">085729158209</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <a href="https://wa.me/6285729158209" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Hubungi via WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <a href="mailto:vickazy@gmail.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Kirim Email
                </a>
              </Button>
            </div>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck size={14} />
              Dibuat dengan perhatian pada keamanan data madrasah
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-xs text-muted-foreground">
        Dibuat <Heart size={13} className="fill-rose-500 text-rose-500" /> oleh Sunarno untuk
        Madrasah Diniyah Takmiliyah Miftahul Ulum Bermi
      </p>
    </div>
  );
}
