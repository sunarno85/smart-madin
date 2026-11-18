import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function SubjectsPage() {
  const queryClient = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<any>(null);
  const [openDelete, setOpenDelete] = useState<any>(null);
  const emptyForm = { code: '', name: '', nameArabic: '', description: '' };
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/subjects').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/subjects', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setOpenCreate(false);
      setForm(emptyForm);
      toast.success('Mata pelajaran berhasil ditambahkan');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal menambahkan mata pelajaran'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/subjects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setOpenEdit(null);
      toast.success('Mata pelajaran berhasil diupdate');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal mengupdate mata pelajaran'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/subjects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setOpenDelete(null);
      toast.success('Mata pelajaran berhasil dihapus');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal menghapus mata pelajaran'),
  });

  const openEditDialog = (subj: any) => {
    setForm({ code: subj.code, name: subj.name, nameArabic: subj.nameArabic || '', description: subj.description || '' });
    setOpenEdit(subj);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mata Pelajaran</h1>
          <p className="text-muted-foreground">Daftar mata pelajaran</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setOpenCreate(true); }}><Plus className="mr-2 h-4 w-4" />Tambah Mata Pelajaran</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Mata Pelajaran</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Nama Arab</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-center w-20">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-full animate-pulse rounded bg-muted" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
              ) : (
                data?.map((subj: any, i: number) => (
                  <TableRow key={subj.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-mono">{subj.code}</TableCell>
                    <TableCell className="font-medium">{subj.name}</TableCell>
                    <TableCell dir="rtl">{subj.nameArabic || '-'}</TableCell>
                    <TableCell>{subj.description || '-'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(subj)}><Edit size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setOpenDelete(subj)}><Trash2 size={14} /></Button>
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
          <DialogHeader><DialogTitle>Tambah Mata Pelajaran</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <div className="space-y-2"><Label>Kode *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Nama Arab</Label><Input value={form.nameArabic} onChange={(e) => setForm({ ...form, nameArabic: e.target.value })} dir="rtl" /></div>
            <div className="space-y-2"><Label>Deskripsi</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
              <Button type="submit" loading={createMutation.isPending}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!openEdit} onOpenChange={(o) => !o && setOpenEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Mata Pelajaran</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ id: openEdit?.id, data: form }); }} className="space-y-4">
            <div className="space-y-2"><Label>Kode *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Nama Arab</Label><Input value={form.nameArabic} onChange={(e) => setForm({ ...form, nameArabic: e.target.value })} dir="rtl" /></div>
            <div className="space-y-2"><Label>Deskripsi</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenEdit(null)}>Batal</Button>
              <Button type="submit" loading={updateMutation.isPending}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!openDelete} onOpenChange={(o) => !o && setOpenDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Mata Pelajaran</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Yakin ingin menghapus <strong>{openDelete?.name}</strong>?</p>
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
