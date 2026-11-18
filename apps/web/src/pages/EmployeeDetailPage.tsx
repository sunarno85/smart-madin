import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ArrowLeft, Printer, Camera, User, Upload, X } from 'lucide-react';
import { PrintHeader, PrintFooter } from '../components/PrintHeader';
import { toast } from 'sonner';
import { formatGender, formatStatus, getStatusColor } from '../lib/utils';
import { useCan } from '../components/Can';

const UPLOAD_BASE = api.defaults.baseURL?.replace('/api', '') || '';

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canUpdate = useCan('employees.update');

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => api.get(`/employees/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: () => api.get('/school/profile').then((r) => r.data),
  });

  const photoUploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('photo', file);
      return api.patch(`/employees/${id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      toast.success('Foto berhasil diunggah');
    },
    onError: () => toast.error('Gagal mengunggah foto'),
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 2MB');
      return;
    }
    photoUploadMutation.mutate(file);
  };

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Pegawai tidak ditemukan</p>
        <Link to="/employees"><Button variant="outline" className="mt-4">Kembali</Button></Link>
      </div>
    );
  }

  const photoUrl = employee.photo ? `${UPLOAD_BASE}/uploads/${employee.photo}` : null;
  const isTeacher = employee.employeeType === 'TEACHER';

  return (
    <div className="space-y-6 print:space-y-2">
      {/* Header - hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link to="/employees"><Button variant="ghost" size="icon"><ArrowLeft size={20} /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{employee.fullName}</h1>
            <p className="text-muted-foreground">{employee.employeeNumber} • {isTeacher ? 'Guru (PTK)' : 'Tendik'}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Cetak</Button>
      </div>

      {/* ── Print Header ── */}
      <PrintHeader title="Biodata Pegawai" />

      {/* ── Photo + Info Card ── */}
      <Card className="print:border print:shadow-none">
        <CardContent className="p-6 print:p-3">
          <div className="flex items-start gap-6">
            {/* Photo — larger for print */}
            <div className="relative group shrink-0">
              <div
                className="rounded-xl border-2 border-dashed overflow-hidden bg-muted flex items-center justify-center"
                style={{ width: 120, height: 150 }}
              >
                {photoUrl ? (
                  <img src={photoUrl} alt={employee.fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center">
                    <User className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="text-[9px] text-muted-foreground mt-1">Foto</p>
                  </div>
                )}
              </div>
              {/* Upload overlay — hidden on print */}
              {canUpdate && (
                <button
                  className="print:hidden absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-6 w-6 text-white mb-1" />
                  <span className="text-[10px] text-white font-medium">
                    {photoUploadMutation.isPending ? 'Uploading...' : 'Ubah Foto'}
                  </span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              {/* Print-only photo label */}
              <div className="hidden print:block text-center mt-1">
                <p className="text-[8px] text-gray-500">{employee.employeeNumber}</p>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xl font-bold">{employee.fullName}</h2>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(employee.activityStatus)}`}>
                  {formatStatus(employee.activityStatus)}
                </span>
                <Badge variant={isTeacher ? 'default' : 'secondary'}>
                  {isTeacher ? 'Guru (PTK)' : 'Tendik'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">No Induk: </span><span className="font-medium">{employee.employeeNumber}</span></div>
                <div><span className="text-muted-foreground">Jenis Kelamin: </span><span className="font-medium">{formatGender(employee.gender)}</span></div>
                <div><span className="text-muted-foreground">NIK: </span><span className="font-medium">{employee.nik || '-'}</span></div>
                <div><span className="text-muted-foreground">Pendidikan: </span><span className="font-medium">{employee.educationLevel || '-'}</span></div>
                <div><span className="text-muted-foreground">Tempat Lahir: </span><span className="font-medium">{employee.birthPlace || '-'}</span></div>
                <div><span className="text-muted-foreground">Tanggal Lahir: </span><span className="font-medium">
                  {employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                </span></div>
                <div><span className="text-muted-foreground">Telepon: </span><span className="font-medium">{employee.phone || '-'}</span></div>
                <div><span className="text-muted-foreground">Email: </span><span className="font-medium">{employee.email || '-'}</span></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs defaultValue="biodata" className="w-full">
        <TabsList className="print:hidden">
          <TabsTrigger value="biodata">Data Diri</TabsTrigger>
          <TabsTrigger value="subjects">{isTeacher ? 'Mata Pelajaran' : 'Jadwal'}</TabsTrigger>
          <TabsTrigger value="schedule">Jadwal Mengajar</TabsTrigger>
        </TabsList>

        {/* Tab: Data Diri */}
        <TabsContent value="biodata">
          <Card className="print:border print:shadow-none">
            <CardHeader className="print-section-header"><CardTitle className="text-base">Data Lengkap</CardTitle></CardHeader>
            <CardContent className="print-section-content">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:gap-2">
                {[
                  ['No Induk', employee.employeeNumber],
                  ['NIK', employee.nik],
                  ['Nama Lengkap', employee.fullName],
                  ['Jenis Kelamin', formatGender(employee.gender)],
                  ['Tipe Pegawai', isTeacher ? 'Guru (PTK)' : 'Tendik'],
                  ['Status Aktivitas', formatStatus(employee.activityStatus)],
                  ['Tempat Lahir', employee.birthPlace],
                  ['Tanggal Lahir', employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'],
                  ['Alamat', employee.address],
                  ['Telepon', employee.phone],
                  ['Email', employee.email],
                  ['Pendidikan', employee.educationLevel],
                  ['Bidang Keahlian', employee.subjectArea],
                  ['Status Kepegawaian', employee.employmentStatus],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-sm text-muted-foreground print:text-[9px]">{label}</p>
                    <p className="font-medium print:text-[10px]">{value || '-'}</p>
                  </div>
                ))}
                {employee.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground print:text-[9px]">Catatan</p>
                    <p className="font-medium print:text-[10px]">{employee.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Mata Pelajaran (teacher) / Kepegawaian (tendik) */}
        <TabsContent value="subjects">
          <Card className="print:border print:shadow-none">
            <CardHeader className="print-section-header">
              <CardTitle className="text-base">{isTeacher ? 'Mata Pelajaran yang Diampu' : 'Informasi Kepegawaian'}</CardTitle>
            </CardHeader>
            <CardContent className="print-section-content">
              {isTeacher ? (
                employee.teacherSubjects?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">No</TableHead>
                        <TableHead>Mata Pelajaran</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead>Jenjang</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.teacherSubjects.map((ts: any, i: number) => (
                        <TableRow key={ts.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-medium">{ts.subject?.name}</TableCell>
                          <TableCell>{ts.class?.name || '-'}</TableCell>
                          <TableCell>{ts.class?.level?.name || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-4">Belum ada mata pelajaran yang diampu</p>
                )
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:gap-2">
                  {[
                    ['Status Kepegawaian', employee.employmentStatus],
                    ['Tipe Pegawai', isTeacher ? 'Guru (PTK)' : 'Tendik'],
                    ['Bidang Keahlian', employee.subjectArea],
                    ['Pendidikan Terakhir', employee.educationLevel],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="font-medium">{value || '-'}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Jadwal Mengajar */}
        <TabsContent value="schedule">
          <Card className="print:border print:shadow-none">
            <CardHeader className="print-section-header"><CardTitle className="text-base">Jadwal Mengajar</CardTitle></CardHeader>
            <CardContent className="print-section-content">
              {employee.schedules?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hari</TableHead>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Mata Pelajaran</TableHead>
                      <TableHead>Ruangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employee.schedules.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][s.dayOfWeek]}</TableCell>
                        <TableCell>
                          {new Date(s.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(s.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>{s.class?.name}</TableCell>
                        <TableCell>{s.subject?.name}</TableCell>
                        <TableCell>{s.room || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-4">Belum ada jadwal mengajar</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Print Footer ── */}
      <PrintFooter />
    </div>
  );
}
