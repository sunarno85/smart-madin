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
  DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Search, Trash2, Edit, Eye, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Can } from '../components/Can';
import { formatGender, formatStatus, getStatusColor } from '../lib/utils';

const EMPTY_FORM = {
  fullName: '', nik: '', gender: 'MALE', employeeType: 'TEACHER',
  birthPlace: '', birthDate: '', address: '', phone: '', email: '',
  educationLevel: '', subjectArea: '', employmentStatus: '', notes: '',
};

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<string | null>(null);
  const [openDelete, setOpenDelete] = useState<any>(null);
  const [openDetail, setOpenDetail] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', { page, search, employeeType: typeFilter }],
    queryFn: () =>
      api.get('/employees', { params: { page, pageSize: 20, search, employeeType: typeFilter } }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/employees', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setOpenCreate(false);
      setForm(EMPTY_FORM);
      toast.success('Pegawai berhasil ditambahkan');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menambahkan pegawai'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => api.patch(`/employees/${id}`, d),
    onSuccess: async (res, vars) => {
      if (photoFile) {
        const fd = new FormData();
        fd.append('photo', photoFile);
        await api.patch(`/employees/${vars.id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setOpenEdit(null);
      setForm(EMPTY_FORM);
      setPhotoFile(null);
      setPhotoPreview(null);
      toast.success('Data pegawai berhasil diperbarui');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal memperbarui data'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setOpenDelete(null);
      toast.success('Pegawai berhasil dihapus');
    },
  });

  const photoUploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const fd = new FormData();
      fd.append('photo', file);
      return api.patch(`/employees/${id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Foto berhasil diunggah');
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const openCreateDialog = () => { setForm(EMPTY_FORM); setPhotoFile(null); setPhotoPreview(null); setOpenCreate(true); };

  const openEditDialog = (emp: any) => {
    setForm({
      fullName: emp.fullName || '',
      nik: emp.nik || '',
      gender: emp.gender || 'MALE',
      employeeType: emp.employeeType || 'TEACHER',
      birthPlace: emp.birthPlace || '',
      birthDate: emp.birthDate ? new Date(emp.birthDate).toISOString().split('T')[0] : '',
      address: emp.address || '',
      phone: emp.phone || '',
      email: emp.email || '',
      educationLevel: emp.educationLevel || '',
      subjectArea: emp.subjectArea || '',
      employmentStatus: emp.employmentStatus || '',
      notes: emp.notes || '',
    });
    setPhotoFile(null);
    setPhotoPreview(emp.photo ? `${api.defaults.baseURL?.replace('/api', '')}/uploads/${emp.photo}` : null);
    setOpenEdit(emp.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (openEdit) {
      updateMutation.mutate({ id: openEdit, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const FormFields = () => (
    <div className="space-y-4">
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Nama Lengkap *</Label>
        <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
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
        <Label>Tipe Pegawai *</Label>
        <Select value={form.employeeType} onValueChange={(v) => setForm({ ...form, employeeType: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TEACHER">Guru (PTK)</SelectItem>
            <SelectItem value="STAFF">Tendik</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>NIK</Label>
        <Input value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} maxLength={16} />
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
        <Label>Telepon</Label>
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Pendidikan</Label>
        <Input value={form.educationLevel} onChange={(e) => setForm({ ...form, educationLevel: e.target.value })} placeholder="S1, S2, SMA, dll." />
      </div>
      <div className="space-y-2">
        <Label>Bidang Keahlian</Label>
        <Input value={form.subjectArea} onChange={(e) => setForm({ ...form, subjectArea: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Status Kepegawaian</Label>
        <Input value={form.employmentStatus} onChange={(e) => setForm({ ...form, employmentStatus: e.target.value })} placeholder="PNS, Honorer, dll." />
      </div>
      <div className="space-y-2">
        <Label>Catatan</Label>
        <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
    </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PTK & Tendik</h1>
          <p className="text-muted-foreground">Data pegawai dan tenaga pendidik</p>
        </div>
        <Can permission="employees.create">
          <Button onClick={openCreateDialog}><Plus className="mr-2 h-4 w-4" /> Tambah Pegawai</Button>
        </Can>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Cari nama, NIK, nomor induk..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Semua Tipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="TEACHER">Guru (PTK)</SelectItem>
                <SelectItem value="STAFF">Tendik</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Pegawai ({data?.meta?.total || 0})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Foto</TableHead>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>No Induk</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>L/P</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Pendidikan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>{[...Array(8)].map((_, j) => <TableCell key={j}><div className="h-4 w-full animate-pulse rounded bg-muted" /></TableCell>)}</TableRow>
                  ))
                ) : data?.data?.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Tidak ada data pegawai</TableCell></TableRow>
                ) : (
                  data?.data?.map((emp: any, index: number) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        {emp.photo ? (
                          <img src={`${api.defaults.baseURL?.replace('/api', '')}/uploads/${emp.photo}`} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {emp.fullName?.charAt(0)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{(page - 1) * 20 + index + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{emp.employeeNumber}</TableCell>
                      <TableCell className="font-medium">{emp.fullName}</TableCell>
                      <TableCell>{formatGender(emp.gender)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${emp.employeeType === 'TEACHER' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'}`}>
                          {emp.employeeType === 'TEACHER' ? 'Guru' : 'Tendik'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{emp.educationLevel || '-'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(emp.activityStatus)}`}>
                          {formatStatus(emp.activityStatus)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link to={`/employees/${emp.id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Eye size={16} /></Button></Link>
                          <Can permission="employees.update">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(emp)}><Edit size={16} /></Button>
                          </Can>
                          <Can permission="employees.delete">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setOpenDelete(emp)}><Trash2 size={16} /></Button>
                          </Can>
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
              <p className="text-sm text-muted-foreground">Halaman {page} dari {data.meta.totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
                <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Selanjutnya</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!openDetail} onOpenChange={(o) => !o && setOpenDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detail Pegawai</DialogTitle></DialogHeader>
          {openDetail && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">No Induk</p><p className="font-medium">{openDetail.employeeNumber}</p></div>
                <div><p className="text-muted-foreground">NIK</p><p className="font-medium">{openDetail.nik || '-'}</p></div>
                <div><p className="text-muted-foreground">Nama</p><p className="font-medium">{openDetail.fullName}</p></div>
                <div><p className="text-muted-foreground">Jenis Kelamin</p><p className="font-medium">{formatGender(openDetail.gender)}</p></div>
                <div><p className="text-muted-foreground">Tipe</p><p className="font-medium">{openDetail.employeeType === 'TEACHER' ? 'Guru (PTK)' : 'Tendik'}</p></div>
                <div><p className="text-muted-foreground">Status</p><p className="font-medium">{formatStatus(openDetail.activityStatus)}</p></div>
                <div><p className="text-muted-foreground">Tempat Lahir</p><p className="font-medium">{openDetail.birthPlace || '-'}</p></div>
                <div><p className="text-muted-foreground">Tanggal Lahir</p><p className="font-medium">{openDetail.birthDate ? new Date(openDetail.birthDate).toLocaleDateString('id-ID') : '-'}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">Alamat</p><p className="font-medium">{openDetail.address || '-'}</p></div>
                <div><p className="text-muted-foreground">Telepon</p><p className="font-medium">{openDetail.phone || '-'}</p></div>
                <div><p className="text-muted-foreground">Email</p><p className="font-medium">{openDetail.email || '-'}</p></div>
                <div><p className="text-muted-foreground">Pendidikan</p><p className="font-medium">{openDetail.educationLevel || '-'}</p></div>
                <div><p className="text-muted-foreground">Bidang Keahlian</p><p className="font-medium">{openDetail.subjectArea || '-'}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={openCreate || !!openEdit} onOpenChange={(o) => { if (!o) { setOpenCreate(false); setOpenEdit(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openEdit ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}</DialogTitle>
            <DialogDescription>{openEdit ? 'Perbarui data pegawai' : 'Isi data pegawai dengan lengkap'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormFields />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpenCreate(false); setOpenEdit(null); }}>Batal</Button>
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
          <DialogHeader><DialogTitle>Hapus Pegawai</DialogTitle></DialogHeader>
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
