import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Edit, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Can } from '../components/Can';
import { formatDateShort } from '../lib/utils';
import { toast } from 'sonner';

export function AcademicYearsPage() {
  const queryClient = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<any>(null);
  const [openDelete, setOpenDelete] = useState<any>(null);
  const emptyForm = { name: '', startDate: '', endDate: '' };
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({ queryKey: ['academic-years'], queryFn: () => api.get('/academic-years').then((r) => r.data) });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/academic-years', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academic-years'] }); setOpenCreate(false); setForm(emptyForm); toast.success('Tahun ajaran berhasil ditambahkan'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal menambahkan tahun ajaran'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/academic-years/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academic-years'] }); setOpenEdit(null); toast.success('Tahun ajaran berhasil diupdate'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal mengupdate tahun ajaran'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/academic-years/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academic-years'] }); setOpenDelete(null); toast.success('Tahun ajaran berhasil dihapus'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal menghapus tahun ajaran'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/academic-years/${id}/activate`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academic-years'] }); toast.success('Tahun ajaran diaktifkan'); },
  });

  const openEditDialog = (year: any) => {
    setForm({
      name: year.name,
      startDate: year.startDate ? year.startDate.split('T')[0] : '',
      endDate: year.endDate ? year.endDate.split('T')[0] : '',
    });
    setOpenEdit(year);
  };

  const renderForm = () => (
    <div className="space-y-4">
      <div className="space-y-2"><Label>Nama *</Label><Input placeholder="2024/2025" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
      <div className="space-y-2"><Label>Tanggal Mulai *</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></div>
      <div className="space-y-2"><Label>Tanggal Selesai *</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tahun Ajaran</h1>
          <p className="text-muted-foreground">Manajemen tahun ajaran</p>
        </div>
        <Can permission="academic_years.create">
          <Button onClick={() => { setForm(emptyForm); setOpenCreate(true); }}><Plus className="mr-2 h-4 w-4" />Tambah Tahun Ajaran</Button>
        </Can>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Tahun Ajaran</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Tanggal Mulai</TableHead>
                <TableHead>Tanggal Selesai</TableHead>
                <TableHead className="text-center">Semester Aktif</TableHead>
                <TableHead className="text-center">PPDB</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center w-32">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => <TableRow key={i}>{[...Array(8)].map((_, j) => <TableCell key={j}><div className="h-4 w-full animate-pulse rounded bg-muted" /></TableCell>)}</TableRow>)
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
              ) : (
                data?.map((year: any, i: number) => (
                  <TableRow key={year.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{year.name}</TableCell>
                    <TableCell>{formatDateShort(year.startDate)}</TableCell>
                    <TableCell>{formatDateShort(year.endDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant={year.activeSemester === 'SATU' ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 px-2.5"
                          title="Jadikan Semester 1 aktif"
                          onClick={() => year.activeSemester !== 'SATU' && updateMutation.mutate({ id: year.id, data: { activeSemester: 'SATU' } })}
                        >
                          Semester 1
                        </Button>
                        <Button
                          variant={year.activeSemester === 'DUA' ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 px-2.5"
                          title="Jadikan Semester 2 aktif"
                          onClick={() => year.activeSemester !== 'DUA' && updateMutation.mutate({ id: year.id, data: { activeSemester: 'DUA' } })}
                        >
                          Semester 2
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Button
                          variant={year.ppdbOpen ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 px-3"
                          title={year.ppdbOpen ? 'Tutup pendaftaran PPDB' : 'Buka pendaftaran PPDB untuk tahun ini'}
                          onClick={() => updateMutation.mutate({ id: year.id, data: { ppdbOpen: !year.ppdbOpen } })}
                        >
                          {year.ppdbOpen ? 'Dibuka' : 'Tertutup'}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {year.isActive ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600"><CheckCircle2 size={16} /> Aktif</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Circle size={16} /> Tidak Aktif</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Can permission="academic_years.update">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(year)}><Edit size={14} /></Button>
                        </Can>
                        {!year.isActive && (
                          <>
                            <Can permission="academic_years.manage">
                              <Button variant="outline" size="sm" onClick={() => activateMutation.mutate(year.id)} loading={activateMutation.isPending}>Aktifkan</Button>
                            </Can>
                            <Can permission="academic_years.delete">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setOpenDelete(year)}><Trash2 size={14} /></Button>
                            </Can>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Tahun Ajaran</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}>
            {renderForm()}
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
              <Button type="submit" loading={createMutation.isPending}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!openEdit} onOpenChange={(o) => !o && setOpenEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Tahun Ajaran</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ id: openEdit?.id, data: form }); }}>
            {renderForm()}
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpenEdit(null)}>Batal</Button>
              <Button type="submit" loading={updateMutation.isPending}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!openDelete} onOpenChange={(o) => !o && setOpenDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Tahun Ajaran</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Yakin ingin menghapus tahun ajaran <strong>{openDelete?.name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDelete(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(openDelete?.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
