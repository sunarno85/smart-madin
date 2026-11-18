import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Search, Eye, Edit, Trash2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatGender, formatStatus, getStatusColor } from '../lib/utils';

const EMPTY_FORM = {
  fullName: '', nik: '', nisn: '', gender: 'MALE',
  birthPlace: '', birthDate: '', address: '', village: '', district: '', regency: '', province: '',
  guardianName: '', guardianPhone: '',
  fatherName: '', fatherNik: '', fatherPhone: '', fatherOccupation: '',
  motherName: '', motherNik: '', motherPhone: '', motherOccupation: '',
};

export function StudentsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<any>(null);
  const [openDelete, setOpenDelete] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['students', { page, pageSize, search, status: statusFilter, gender: genderFilter }],
    queryFn: () => api.get('/students', { params: { page, pageSize, search, status: statusFilter, gender: genderFilter } }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/students', d),
    onSuccess: async (res) => {
      if (photoFile && res.data?.id) {
        const fd = new FormData();
        fd.append('photo', photoFile);
        await api.patch(`/students/${res.data.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setOpenCreate(false);
      setForm(EMPTY_FORM);
      setPhotoFile(null);
      setPhotoPreview(null);
      toast.success('Santri berhasil ditambahkan');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menambahkan santri'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => api.patch(`/students/${id}`, d),
    onSuccess: async (res, vars) => {
      if (photoFile) {
        const fd = new FormData();
        fd.append('photo', photoFile);
        await api.patch(`/students/${vars.id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setOpenEdit(null);
      setForm(EMPTY_FORM);
      setPhotoFile(null);
      setPhotoPreview(null);
      toast.success('Data santri berhasil diperbarui');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal memperbarui data'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/students/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setOpenDelete(null);
      toast.success('Santri berhasil dihapus');
    },
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const openCreateDialog = () => { resetForm(); setOpenCreate(true); };

  const openEditDialog = (s: any) => {
    const father = s.parents?.find((p: any) => p.relationship === 'FATHER');
    const mother = s.parents?.find((p: any) => p.relationship === 'MOTHER');
    setForm({
      fullName: s.fullName || '', nik: s.nik || '', nisn: s.nisn || '', gender: s.gender || 'MALE',
      birthPlace: s.birthPlace || '', birthDate: s.birthDate ? new Date(s.birthDate).toISOString().split('T')[0] : '',
      address: s.address || '', village: s.village || '', district: s.district || '', regency: s.regency || '', province: s.province || '',
      guardianName: s.guardianName || '', guardianPhone: s.guardianPhone || '',
      fatherName: father?.name || '', fatherNik: father?.nik || '', fatherPhone: father?.phone || '', fatherOccupation: father?.occupation || '',
      motherName: mother?.name || '', motherNik: mother?.nik || '', motherPhone: mother?.phone || '', motherOccupation: mother?.occupation || '',
    });
    setPhotoFile(null);
    setPhotoPreview(s.photo ? `${api.defaults.baseURL?.replace('/api', '')}/uploads/${s.photo}` : null);
    setOpenEdit(s);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      parents: [
        ...(form.fatherName ? [{ relationship: 'FATHER', name: form.fatherName, nik: form.fatherNik, phone: form.fatherPhone, occupation: form.fatherOccupation }] : []),
        ...(form.motherName ? [{ relationship: 'MOTHER', name: form.motherName, nik: form.motherNik, phone: form.motherPhone, occupation: form.motherOccupation }] : []),
      ],
    };
    if (openEdit) {
      updateMutation.mutate({ id: openEdit.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const StudentFormFields = () => (
    <div className="space-y-6">
      {/* Photo */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed">
            {photoPreview ? (
              <img src={photoPreview} alt="Foto" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Camera className="mr-2 h-4 w-4" /> {photoPreview ? 'Ganti Foto' : 'Upload Foto'}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">JPG/PNG, max 2MB</p>
        </div>
      </div>

      {/* Data Diri */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Data Diri</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Nama Lengkap *</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>NIK</Label>
            <Input value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} maxLength={16} />
          </div>
          <div className="space-y-2">
            <Label>NISN</Label>
            <Input value={form.nisn} onChange={(e) => setForm({ ...form, nisn: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Jenis Kelamin *</Label>
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Laki-laki</SelectItem>
                <SelectItem value="FEMALE">Perempuan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tempat Lahir</Label>
            <Input value={form.birthPlace} onChange={(e) => setForm({ ...form, birthPlace: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Lahir</Label>
            <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Alamat</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Desa/Kelurahan</Label>
            <Input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Kecamatan</Label>
            <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Kabupaten</Label>
            <Input value={form.regency} onChange={(e) => setForm({ ...form, regency: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Provinsi</Label>
            <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Ayah */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Data Ayah</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nama Ayah</Label>
            <Input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>NIK Ayah</Label>
            <Input value={form.fatherNik} onChange={(e) => setForm({ ...form, fatherNik: e.target.value })} maxLength={16} />
          </div>
          <div className="space-y-2">
            <Label>Telepon Ayah</Label>
            <Input value={form.fatherPhone} onChange={(e) => setForm({ ...form, fatherPhone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Pekerjaan Ayah</Label>
            <Input value={form.fatherOccupation} onChange={(e) => setForm({ ...form, fatherOccupation: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Ibu */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Data Ibu</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nama Ibu</Label>
            <Input value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>NIK Ibu</Label>
            <Input value={form.motherNik} onChange={(e) => setForm({ ...form, motherNik: e.target.value })} maxLength={16} />
          </div>
          <div className="space-y-2">
            <Label>Telepon Ibu</Label>
            <Input value={form.motherPhone} onChange={(e) => setForm({ ...form, motherPhone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Pekerjaan Ibu</Label>
            <Input value={form.motherOccupation} onChange={(e) => setForm({ ...form, motherOccupation: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Santri</h1>
          <p className="text-muted-foreground">Data seluruh santri</p>
        </div>
        <Button onClick={openCreateDialog}><Plus className="mr-2 h-4 w-4" /> Tambah Santri</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari nama, NIK, NISN, nomor induk..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Semua Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="INACTIVE">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
            <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Semua Gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Gender</SelectItem>
                <SelectItem value="MALE">Laki-laki</SelectItem>
                <SelectItem value="FEMALE">Perempuan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Santri ({data?.meta?.total || 0})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Foto</TableHead>
                  <TableHead>No</TableHead>
                  <TableHead>No Induk</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>NISN</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>L/P</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>{[...Array(9)].map((_, j) => <TableCell key={j}><div className="h-4 w-full animate-pulse rounded bg-muted" /></TableCell>)}</TableRow>
                  ))
                ) : data?.data?.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">Tidak ada data santri</TableCell></TableRow>
                ) : (
                  data?.data?.map((student: any, index: number) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        {student.photo ? (
                          <img src={`${api.defaults.baseURL?.replace('/api', '')}/uploads/${student.photo}`} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {student.fullName?.charAt(0)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{student.studentNumber}</TableCell>
                      <TableCell className="font-mono text-xs">{student.nik || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{student.nisn || '-'}</TableCell>
                      <TableCell className="font-medium">{student.fullName}</TableCell>
                      <TableCell>{formatGender(student.gender)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(student.status)}`}>
                          {formatStatus(student.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link to={`/students/${student.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Eye size={16} /></Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(student)}><Edit size={16} /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setOpenDelete(student)}><Trash2 size={16} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {data?.meta?.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Menampilkan {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, data.meta.total)} dari {data.meta.total}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
                <span className="text-sm">Hal {page} dari {data.meta.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Selanjutnya</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={openCreate || !!openEdit} onOpenChange={(o) => { if (!o) { setOpenCreate(false); setOpenEdit(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openEdit ? 'Edit Santri' : 'Tambah Santri Baru'}</DialogTitle>
            <DialogDescription>{openEdit ? 'Perbarui data santri' : 'Isi data santri dengan lengkap'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <StudentFormFields />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpenCreate(false); setOpenEdit(null); resetForm(); }}>Batal</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!openDelete} onOpenChange={(o) => !o && setOpenDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Santri</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Yakin ingin menghapus <strong>{openDelete?.fullName}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDelete(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => openDelete && deleteMutation.mutate(openDelete.id)}>
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
