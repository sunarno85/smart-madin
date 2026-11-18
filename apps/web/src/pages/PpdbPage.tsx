import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Eye, Search, UserCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateShort } from '../lib/utils';
import { Can } from '../components/Can';

const STATUS_LABEL: Record<string, string> = {
  BARU: 'Baru',
  VERIFIED: 'Terverifikasi',
  ACCEPTED: 'Diterima',
  WAITLISTED: 'Cadangan',
  REJECTED: 'Ditolak',
  ENROLLED: 'Jadi Santri',
};

const STATUS_COLOR: Record<string, string> = {
  BARU: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  VERIFIED: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  ACCEPTED: 'bg-green-100 text-green-800 hover:bg-green-100',
  WAITLISTED: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  REJECTED: 'bg-red-100 text-red-800 hover:bg-red-100',
  ENROLLED: 'bg-teal-100 text-teal-800 hover:bg-teal-100',
};

export function PpdbPage() {
  const queryClient = useQueryClient();
  const [yearId, setYearId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [enrollConfirm, setEnrollConfirm] = useState<any>(null);

  const { data: years = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => api.get('/academic-years').then((r) => r.data || r),
  });

  // Default: year with PPDB open, else active year
  useEffect(() => {
    if (!years?.length || yearId) return;
    const open = years.find((y: any) => y.ppdbOpen);
    const active = years.find((y: any) => y.isActive);
    setYearId((open ?? active ?? years[0])?.id ?? '');
  }, [years, yearId]);

  const { data: stats } = useQuery({
    queryKey: ['ppdb-stats', yearId],
    queryFn: () => api.get('/ppdb/stats', { params: yearId ? { targetYearId: yearId } : {} }).then((r) => r.data),
    enabled: !!yearId,
  });

  const { data: listResponse, isLoading } = useQuery({
    queryKey: ['ppdb-list', yearId, statusFilter, search],
    queryFn: () =>
      api
        .get('/ppdb/registrations', {
          params: {
            targetYearId: yearId,
            ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
            ...(search ? { search } : {}),
            pageSize: 100,
          },
        })
        .then((r) => r.data),
    enabled: !!yearId,
  });
  const registrations = listResponse?.data ?? [];

  const openDetail = async (id: string) => {
    try {
      const res = await api.get(`/ppdb/registrations/${id}`).then((r) => r.data);
      setDetail(res);
      setNotes(res.notes ?? '');
    } catch {
      toast.error('Gagal memuat detail pendaftaran');
    }
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      api.patch(`/ppdb/registrations/${id}/status`, { status, notes }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['ppdb-list'] });
      queryClient.invalidateQueries({ queryKey: ['ppdb-stats'] });
      setDetail(null);
      toast.success(`Status ${res.data.fullName} diperbarui: ${STATUS_LABEL[res.data.status] ?? res.data.status}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal memperbarui status'),
  });

  const enrollMutation = useMutation({
    mutationFn: (id: string) => api.post(`/ppdb/registrations/${id}/enroll`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['ppdb-list'] });
      queryClient.invalidateQueries({ queryKey: ['ppdb-stats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setEnrollConfirm(null);
      setDetail(null);
      toast.success(`${res.data.fullName} terdaftar sebagai santri ${res.data.student?.studentNumber}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal mendaftarkan santri'),
  });

  const statCards = stats
    ? [
        { label: 'Total Pendaftar', value: stats.total, color: 'text-foreground' },
        { label: 'Baru', value: stats.BARU, color: 'text-amber-600' },
        { label: 'Terverifikasi', value: stats.VERIFIED, color: 'text-blue-600' },
        { label: 'Diterima', value: stats.ACCEPTED, color: 'text-green-600' },
        { label: 'Cadangan', value: stats.WAITLISTED, color: 'text-purple-600' },
        { label: 'Jadi Santri', value: stats.ENROLLED, color: 'text-teal-600' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">PPDB — Santri Baru</h1>
          <p className="text-muted-foreground">Kelola pendaftaran peserta didik baru</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Select value={yearId} onValueChange={setYearId}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tahun ajaran" /></SelectTrigger>
            <SelectContent>
              {(years ?? []).map((y: any) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name}{y.ppdbOpen ? ' (PPDB buka)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.open('/pendaftaran', '_blank')}>
            <UserPlus className="mr-2 h-4 w-4" /> Buka Formulir
          </Button>
        </div>
      </div>

      {/* Stats */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters + Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Daftar Pendaftar</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="BARU">Baru</SelectItem>
                  <SelectItem value="VERIFIED">Terverifikasi</SelectItem>
                  <SelectItem value="ACCEPTED">Diterima</SelectItem>
                  <SelectItem value="WAITLISTED">Cadangan</SelectItem>
                  <SelectItem value="REJECTED">Ditolak</SelectItem>
                  <SelectItem value="ENROLLED">Jadi Santri</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama / no. pendaftaran"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-[220px] pl-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Pendaftaran</TableHead>
                <TableHead>Nama Calon Santri</TableHead>
                <TableHead>L/P</TableHead>
                <TableHead>Asal Sekolah</TableHead>
                <TableHead>HP Orang Tua</TableHead>
                <TableHead>Tgl Daftar</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center w-24">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-full animate-pulse rounded bg-muted" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : registrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Belum ada pendaftar untuk filter ini
                  </TableCell>
                </TableRow>
              ) : (
                registrations.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.registrationNumber}</TableCell>
                    <TableCell className="font-medium">{r.fullName}</TableCell>
                    <TableCell>{r.gender === 'MALE' ? 'L' : 'P'}</TableCell>
                    <TableCell>{r.previousSchool || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.parentPhone || '-'}</TableCell>
                    <TableCell>{formatDateShort(r.createdAt)}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Detail" onClick={() => openDetail(r.id)}>
                        <Eye size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail / Review Dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detail?.fullName}
              {detail && <Badge className={STATUS_COLOR[detail.status]}>{STATUS_LABEL[detail.status]}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                <div className="flex"><span className="w-36 shrink-0 text-muted-foreground">No. Pendaftaran</span><span>: <span className="font-mono">{detail.registrationNumber}</span></span></div>
                <div className="flex"><span className="w-28 shrink-0 text-muted-foreground">Tahun Ajaran</span><span>: {detail.targetYear?.name}</span></div>
                <div className="flex"><span className="w-36 shrink-0 text-muted-foreground">Jenis Kelamin</span><span>: {detail.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}</span></div>
                <div className="flex"><span className="w-28 shrink-0 text-muted-foreground">Tanggal Daftar</span><span>: {formatDateShort(detail.createdAt)}</span></div>
                <div className="flex"><span className="w-36 shrink-0 text-muted-foreground">NIK</span><span>: {detail.nik || '-'}</span></div>
                <div className="flex"><span className="w-28 shrink-0 text-muted-foreground">NISN</span><span>: {detail.nisn || '-'}</span></div>
                <div className="flex"><span className="w-36 shrink-0 text-muted-foreground">Tempat/Tgl Lahir</span><span>: {detail.birthPlace || '-'}{detail.birthDate ? `, ${formatDateShort(detail.birthDate)}` : ''}</span></div>
                <div className="flex"><span className="w-28 shrink-0 text-muted-foreground">Asal Sekolah</span><span>: {detail.previousSchool || '-'}</span></div>
                <div className="flex"><span className="w-36 shrink-0 text-muted-foreground">Nama Ayah</span><span>: {detail.fatherName || '-'}</span></div>
                <div className="flex"><span className="w-28 shrink-0 text-muted-foreground">Nama Ibu</span><span>: {detail.motherName || '-'}</span></div>
                <div className="flex"><span className="w-36 shrink-0 text-muted-foreground">HP Orang Tua</span><span>: {detail.parentPhone || '-'}</span></div>
                <div className="flex"><span className="w-28 shrink-0 text-muted-foreground">Alamat</span><span>: {detail.address || '-'}</span></div>
              </div>

              {detail.student && (
                <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm">
                  Sudah menjadi santri: <strong>{detail.student.studentNumber}</strong> — {detail.student.fullName}
                </div>
              )}

              {detail.status !== 'ENROLLED' && (
                <>
                  <div className="space-y-2">
                    <Label>Catatan Panitia</Label>
                    <Textarea
                      rows={2}
                      placeholder="Catatan untuk pendaftar (opsional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <DialogFooter className="flex-wrap gap-2 sm:justify-between">
                    <Can permission="ppdb.update">
                    <div className="flex flex-wrap gap-2">
                      {detail.status === 'BARU' && (
                        <Button
                          variant="outline"
                          onClick={() => statusMutation.mutate({ id: detail.id, status: 'VERIFIED', notes })}
                          disabled={statusMutation.isPending}
                        >
                          <UserCheck className="mr-1 h-4 w-4" /> Verifikasi Berkas
                        </Button>
                      )}
                      {(detail.status === 'VERIFIED' || detail.status === 'WAITLISTED' || detail.status === 'BARU') && (
                        <Button
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => statusMutation.mutate({ id: detail.id, status: 'ACCEPTED', notes })}
                          disabled={statusMutation.isPending}
                        >
                          Terima
                        </Button>
                      )}
                      {detail.status !== 'WAITLISTED' && (
                        <Button
                          variant="outline"
                          onClick={() => statusMutation.mutate({ id: detail.id, status: 'WAITLISTED', notes })}
                          disabled={statusMutation.isPending}
                        >
                          Jadikan Cadangan
                        </Button>
                      )}
                      {detail.status !== 'REJECTED' && (
                        <Button
                          variant="destructive"
                          onClick={() => statusMutation.mutate({ id: detail.id, status: 'REJECTED', notes })}
                          disabled={statusMutation.isPending}
                        >
                          Tolak
                        </Button>
                      )}
                    </div>
                    </Can>
                    <Can permission="ppdb.update">
                    {(detail.status === 'ACCEPTED' || detail.status === 'VERIFIED' || detail.status === 'WAITLISTED') && (
                      <Button onClick={() => setEnrollConfirm(detail)} disabled={enrollMutation.isPending}>
                        <UserPlus className="mr-1 h-4 w-4" /> Jadikan Santri
                      </Button>
                    )}
                    </Can>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enroll confirm */}
      <Dialog open={!!enrollConfirm} onOpenChange={(o) => !o && setEnrollConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Jadikan Santri?</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              <strong>{enrollConfirm?.fullName}</strong> akan dibuatkan akun data santri baru dengan nomor induk
              otomatis, lengkap dengan data orang tua.
            </p>
            <p className="text-muted-foreground">
              Setelah menjadi santri, pendaftar bisa ditempatkan di kelas melalui halaman Santri, dan status
              pendaftarannya berubah menjadi "Jadi Santri".
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollConfirm(null)}>Batal</Button>
            <Button onClick={() => enrollMutation.mutate(enrollConfirm?.id)} disabled={enrollMutation.isPending}>
              {enrollMutation.isPending ? 'Memproses...' : 'Ya, Jadikan Santri'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
