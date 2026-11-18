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

export function LevelsPage() {
  const queryClient = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<any>(null);
  const [openDelete, setOpenDelete] = useState<any>(null);
  const emptyForm = { code: '', name: '', description: '', displayOrder: 0 };
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['levels'],
    queryFn: () => api.get('/levels').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/levels', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels'] });
      setOpenCreate(false);
      setForm(emptyForm);
      toast.success('Jenjang berhasil ditambahkan');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal menambahkan jenjang'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/levels/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels'] });
      setOpenEdit(null);
      toast.success('Jenjang berhasil diupdate');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal mengupdate jenjang'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/levels/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels'] });
      setOpenDelete(null);
      toast.success('Jenjang berhasil dihapus');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal menghapus jenjang'),
  });

  const openEditDialog = (level: any) => {
    setForm({ code: level.code, name: level.name, description: level.description || '', displayOrder: level.displayOrder || 0 });
    setOpenEdit(level);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jenjang</h1>
          <p className="text-muted-foreground">Tingkatan jenjang pendidikan</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setOpenCreate(true); }}><Plus className="mr-2 h-4 w-4" />Tambah Jenjang</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Jenjang</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-center">Urutan</TableHead>
                <TableHead className="text-center">Kelas</TableHead>
                <TableHead className="text-center w-20">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-full animate-pulse rounded bg-muted" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
              ) : (
                data?.map((level: any, i: number) => (
                  <TableRow key={level.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-mono">{level.code}</TableCell>
                    <TableCell className="font-medium">{level.name}</TableCell>
                    <TableCell>{level.description || '-'}</TableCell>
                    <TableCell className="text-center">{level.displayOrder}</TableCell>
                    <TableCell className="text-center">{level.classes?.length || 0}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(level)}><Edit size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setOpenDelete(level)}><Trash2 size={14} /></Button>
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
          <DialogHeader><DialogTitle>Tambah Jenjang</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <div className="space-y-2"><Label>Kode *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Deskripsi</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Urutan</Label><Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })} /></div>
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
          <DialogHeader><DialogTitle>Edit Jenjang</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ id: openEdit?.id, data: form }); }} className="space-y-4">
            <div className="space-y-2"><Label>Kode *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Deskripsi</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Urutan</Label><Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })} /></div>
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
          <DialogHeader><DialogTitle>Hapus Jenjang</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Yakin ingin menghapus <strong>{openDelete?.name}</strong>?{openDelete?.classes?.length > 0 && ' Jenjang ini memiliki kelas, tidak dapat dihapus.'}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDelete(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(openDelete?.id)} disabled={deleteMutation.isPending || (openDelete?.classes?.length > 0)}>
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
