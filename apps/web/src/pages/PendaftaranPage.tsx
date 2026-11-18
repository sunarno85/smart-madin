import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { CheckCircle2, ClipboardCheck, School, Search } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABEL: Record<string, string> = {
  BARU: 'Menunggu Verifikasi',
  VERIFIED: 'Terverifikasi',
  ACCEPTED: 'Diterima',
  WAITLISTED: 'Cadangan',
  REJECTED: 'Ditolak',
  ENROLLED: 'Terdaftar sebagai Santri',
};

const STATUS_COLOR: Record<string, string> = {
  BARU: 'bg-amber-100 text-amber-800',
  VERIFIED: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  WAITLISTED: 'bg-purple-100 text-purple-800',
  REJECTED: 'bg-red-100 text-red-800',
  ENROLLED: 'bg-teal-100 text-teal-800',
};

const emptyForm = {
  targetYearId: '',
  fullName: '',
  gender: '',
  nik: '',
  nisn: '',
  birthPlace: '',
  birthDate: '',
  address: '',
  previousSchool: '',
  fatherName: '',
  motherName: '',
  parentPhone: '',
};

export function PendaftaranPage() {
  const [form, setForm] = useState(emptyForm);
  const [result, setResult] = useState<{ registrationNumber: string; fullName: string } | null>(null);
  const [checkNumber, setCheckNumber] = useState('');
  const [checkResult, setCheckResult] = useState<any>(null);

  const { data: openYears = [] } = useQuery({
    queryKey: ['ppdb-open-years'],
    queryFn: () => api.get('/ppdb/public/years').then((r) => r.data || r),
  });

  const registerMutation = useMutation({
    mutationFn: (data: any) => api.post('/ppdb/public/register', data),
    onSuccess: (res) => {
      setResult({ registrationNumber: res.data.registrationNumber, fullName: res.data.fullName });
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal mengirim pendaftaran'),
  });

  const checkMutation = useMutation({
    mutationFn: (num: string) =>
      api.get('/ppdb/public/status', { params: { registrationNumber: num } }).then((r) => r.data),
    onSuccess: (res) => setCheckResult(res),
    onError: () => {
      setCheckResult(null);
      toast.error('Nomor pendaftaran tidak ditemukan');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.targetYearId || !form.fullName || !form.gender) {
      toast.error('Lengkapi field wajib (tahun ajaran, nama, jenis kelamin)');
      return;
    }
    registerMutation.mutate(form);
  };

  const set = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  if (result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-primary/5 p-4">
        <Card className="w-full max-w-lg text-center shadow-lg">
          <CardContent className="space-y-4 p-8">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
            <h1 className="text-xl font-bold">Pendaftaran Berhasil!</h1>
            <p className="text-muted-foreground">
              Jazakumullahu khairan, <strong>{result.fullName}</strong>. Pendaftaran Anda sudah kami terima.
            </p>
            <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">Nomor Pendaftaran Anda</p>
              <p className="font-mono text-2xl font-bold text-primary">{result.registrationNumber}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Simpan nomor ini untuk mengecek status pendaftaran. Panitia akan menghubungi Anda melalui nomor HP orang tua yang terdaftar.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" onClick={() => { setResult(null); setCheckNumber(result.registrationNumber); }}>
                Cek Status
              </Button>
              <Button onClick={() => setResult(null)}>Daftar Lagi</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
            <School size={28} />
          </div>
          <h1 className="text-2xl font-bold">Penerimaan Santri Baru</h1>
          <p className="text-muted-foreground">Formulir Pendaftaran PPDB Madrasah Diniyah</p>
        </div>

        {/* Cek status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 shrink-0 text-primary" />
              <div className="flex-1">
                <Label className="text-sm">Sudah mendaftar? Cek status pendaftaran</Label>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Contoh: PPDB-2025-0001"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={() => checkNumber.trim() && checkMutation.mutate(checkNumber.trim())}
                disabled={checkMutation.isPending || !checkNumber.trim()}
              >
                <Search className="mr-1 h-4 w-4" /> Cek
              </Button>
            </div>
            {checkResult && (
              <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm">
                <p>
                  <strong>{checkResult.fullName}</strong> — {checkResult.targetYear?.name}
                </p>
                <div className="mt-1">
                  <Badge className={STATUS_COLOR[checkResult.status] ?? 'bg-gray-100'}>
                    {STATUS_LABEL[checkResult.status] ?? checkResult.status}
                  </Badge>
                </div>
                {checkResult.notes && (
                  <p className="mt-2 text-muted-foreground">Catatan panitia: {checkResult.notes}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            {openYears.length === 0 ? (
              <div className="py-10 text-center">
                <p className="font-medium">Pendaftaran sedang ditutup</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  PPDB belum dibuka untuk saat ini. Silakan hubungi panitia madrasah untuk informasi lebih lanjut.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tahun Ajaran Tujuan *</Label>
                  <Select value={form.targetYearId} onValueChange={(v) => set('targetYearId', v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih tahun ajaran" /></SelectTrigger>
                    <SelectContent>
                      {openYears.map((y: any) => (
                        <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nama Lengkap Calon Santri *</Label>
                  <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Jenis Kelamin *</Label>
                    <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Laki-laki</SelectItem>
                        <SelectItem value="FEMALE">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Asal Sekolah</Label>
                    <Input value={form.previousSchool} onChange={(e) => set('previousSchool', e.target.value)} placeholder="MI/SD/MTs sebelumnya" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>NIK</Label>
                    <Input value={form.nik} onChange={(e) => set('nik', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>NISN</Label>
                    <Input value={form.nisn} onChange={(e) => set('nisn', e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tempat Lahir</Label>
                    <Input value={form.birthPlace} onChange={(e) => set('birthPlace', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal Lahir</Label>
                    <Input type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Alamat</Label>
                  <Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Dusun/Desa, Kecamatan, Kabupaten" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nama Ayah</Label>
                    <Input value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Ibu</Label>
                    <Input value={form.motherName} onChange={(e) => set('motherName', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>No. HP / WhatsApp Orang Tua</Label>
                  <Input value={form.parentPhone} onChange={(e) => set('parentPhone', e.target.value)} placeholder="08xxxxxxxxxx" />
                </div>

                <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? 'Mengirim...' : 'Kirim Pendaftaran'}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Data yang diisi akan diverifikasi oleh panitia PPDB madrasah.
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">SMART MADIN — Sistem Informasi Madrasah Diniyah Terpadu</p>
      </div>
    </div>
  );
}
