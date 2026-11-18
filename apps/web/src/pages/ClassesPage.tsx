import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function ClassesPage() {
  const queryClient = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<any>(null);
  const [openDelete, setOpenDelete] = useState<any>(null);
  const emptyForm = { name: '', code: '', levelId: '', academicYearId: '', capacity: 40 };
  const [form, setForm] = useState(emptyForm);

  const { data: levels = [] } = useQuery({ queryKey: ['levels'], queryFn: () => api.get('/levels').then((r) => r.data) });
  const { data: years = [] } = useQuery({ queryKey: ['academic-years'], queryFn: () => api.get('/academic-years').then((r) => r.data) });
  const { data, isLoading } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/classes', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setOpenCreate(false); setForm(emptyForm);
      toast.success('Kelas berhasil ditambahkan');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal menambahkan kelas'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/classes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setOpenEdit(null);
      toast.success('Kelas berhasil diupdate');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal mengupdate kelas'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/classes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setOpenDelete(null);
      toast.success('Kelas berhasil dihapus');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal menghapus kelas'),
  });

  const openEditDialog = (cls: any) => {
    setForm({ name: cls.name, code: cls.code, levelId: cls.levelId || '', academicYearId: cls.academicYearId || '', capacity: cls.capacity || 40 });
    setOpenEdit(cls);
  };

  const renderForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Jenjang *</Label>
        <Select value={form.levelId} onValueChange={(v) => setForm({ ...form, levelId: v })}>
          <SelectTrigger><SelectValue placeholder="Pilih Jenjang" /></SelectTrigger>
          <SelectContent>{levels.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Tahun Ajaran *</Label>
        <Select value={form.academicYearId} onValueChange={(v) => setForm({ ...form, academicYearId: v })}>
          <SelectTrigger><SelectValue placeholder="Pilih Tahun Ajaran" /></SelectTrigger>
          <SelectContent>{years.map((y: any) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Nama Kelas *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
      <div className="space-y-2"><Label>Kode *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></div>
      <div className="space-y-2"><Label>Kapasitas</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} /></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kelas</h1>
          <p className="text-muted-foreground">Daftar kelas per tahun ajaran</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setOpenCreate(true); }}><Plus className="mr-2 h-4 w-4" />Tambah Kelas</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Kelas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No</TableHead>
                <TableHead>Jenjang</TableHead>
                <TableHead>Nama Kelas</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Tahun Ajaran</TableHead>
                <TableHead className="text-center">Kapasitas</TableHead>
                <TableHead className="text-center">Santri</TableHead>
                <TableHead className="text-center w-20">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>{[...Array(8)].map((_, j) => <TableCell key={j}><div className="h-4 w-full animate-pulse rounded bg-muted" /></TableCell>)}</TableRow>
                ))
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Tidak ada data kelas</TableCell></TableRow>
              ) : (
                data?.map((cls: any, i: number) => (
                  <TableRow key={cls.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{cls.level?.name}</TableCell>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell className="font-mono text-xs">{cls.code}</TableCell>
                    <TableCell>{cls.academicYear?.name}</TableCell>
                    <TableCell className="text-center">{cls.capacity}</TableCell>
                    <TableCell className="text-center">{cls._count?.studentClassHistories || 0}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(cls)}><Edit size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setOpenDelete(cls)}><Trash2 size={14} /></Button>
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
          <DialogHeader><DialogTitle>Tambah Kelas</DialogTitle></DialogHeader>
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
          <DialogHeader><DialogTitle>Edit Kelas</DialogTitle></DialogHeader>
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
          <DialogHeader><DialogTitle>Hapus Kelas</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Yakin ingin menghapus kelas <strong>{openDelete?.name}</strong>?{(openDelete?._count?.studentClassHistories || 0) > 0 && ' Kelas ini memiliki santri, tidak dapat dihapus.'}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDelete(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(openDelete?.id)} disabled={deleteMutation.isPending || (openDelete?._count?.studentClassHistories || 0) > 0}>
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
