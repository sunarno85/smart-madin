import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { AppLogo } from '../components/AppLogo';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';

const highlights = [
  { icon: GraduationCap, text: 'Data santri & pegawai terpusat' },
  { icon: ClipboardCheck, text: 'Presensi, penilaian, dan rapor' },
  { icon: BookOpen, text: 'Jadwal pelajaran & PPDB online' },
  { icon: FileText, text: 'Laporan siap cetak dalam satu klik' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: () => api.get('/school/profile').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const schoolName = profile?.name || 'Madrasah Diniyah';
  const address = [
    profile?.address,
    profile?.village,
    profile?.district,
    profile?.regency,
    profile?.province,
  ]
    .filter(Boolean)
    .join(', ');
  const contact = [
    profile?.phone ? `Telp: ${profile.phone}` : '',
    profile?.email || '',
  ]
    .filter(Boolean)
    .join('  •  ');
  const showDemoAccounts =
    (import.meta as any).env?.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  const fillDemo = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Username atau password salah. Silakan coba lagi.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-2xl border bg-background shadow-xl lg:grid-cols-[1.1fr_1fr]">
        {/* ── Panel informasi madrasah ── */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-10 lg:flex">
          <div>
            <div className="flex items-center gap-4">
              <AppLogo size={80} className="rounded-2xl" />
              <div>
                <p className="text-2xl font-bold text-primary">SMART MADIN</p>
                <p className="text-sm text-muted-foreground">
                  Sistem Informasi Madrasah Diniyah Terpadu
                </p>
              </div>
            </div>

            <div className="mt-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Selamat datang di
              </p>
              <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground">
                {schoolName}
              </h1>
              {address && (
                <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
                  {address}
                </p>
              )}
              {contact && (
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {profile?.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone size={14} /> {profile.phone}
                    </span>
                  )}
                  {profile?.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail size={14} /> {profile.email}
                    </span>
                  )}
                </p>
              )}
              {(profile?.npsn || profile?.nsm || profile?.principalName) && (
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {profile?.npsn && (
                    <span className="rounded-md border bg-background/70 px-2 py-1">
                      NPSN: {profile.npsn}
                    </span>
                  )}
                  {profile?.nsm && (
                    <span className="rounded-md border bg-background/70 px-2 py-1">
                      NSM: {profile.nsm}
                    </span>
                  )}
                  {profile?.principalName && (
                    <span className="rounded-md border bg-background/70 px-2 py-1">
                      Kepala Madrasah: {profile.principalName}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-10 grid gap-2.5">
              {highlights.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={16} />
                  </span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={15} className="text-primary" />
            Akses dibatasi sesuai hak setiap pengguna • Versi 1.0.0
          </div>
        </div>

        {/* ── Form login ── */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:hidden">
              <AppLogo size={64} className="mx-auto mb-4 rounded-2xl" />
              <p className="text-xl font-bold text-primary">{schoolName}</p>
              <p className="text-xs text-muted-foreground">
                Sistem Informasi Madrasah Diniyah Terpadu
              </p>
            </div>

            <div className="mb-7">
              <h2 className="text-2xl font-bold tracking-tight">Masuk ke akun Anda</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Gunakan username dan password yang diberikan administrator.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Username / Email</Label>
                <div className="relative">
                  <Input
                    id="username"
                    type="text"
                    placeholder="Masukkan username atau email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    className="pl-10"
                  />
                  <UserPlus
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pl-10 pr-10"
                  />
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memeriksa kredensial...
                  </>
                ) : (
                  <>
                    MASUK
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {showDemoAccounts && (
              <div className="mt-6 rounded-lg border bg-muted/30 p-4">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <CheckCircle2 size={14} className="text-primary" />
                  Akun awal (development)
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => fillDemo('admin', 'admin123')}
                    className="rounded-md border bg-background px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                  >
                    <span className="block font-medium">Administrator</span>
                    <span className="text-muted-foreground">admin / admin123</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('headmaster', 'admin123')}
                    className="rounded-md border bg-background px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                  >
                    <span className="block font-medium">Kepala Madrasah</span>
                    <span className="text-muted-foreground">headmaster / admin123</span>
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Klik untuk mengisi otomatis. Ganti password sebelum digunakan di production.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col items-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => navigate('/pendaftaran')}
                className="flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                <UserPlus size={15} />
                Daftar santri baru (PPDB)
                <ExternalLink size={13} />
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Lupa password? Hubungi administrator madrasah
                {profile?.phone ? ` di ${profile.phone}` : ''}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
