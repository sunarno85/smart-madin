import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PrintHeader, PrintFooter } from '../components/PrintHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ArrowLeft, Edit, Printer, Camera, User } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatGender, formatStatus, getStatusColor } from '../lib/utils';

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => api.get(`/students/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: attendanceData } = useQuery({
    queryKey: ['studentAttendance', id],
    queryFn: () => api.get(`/reports/attendance/recap`).then((r) => {
      const recap = r.data;
      for (const cls of recap.byClass || []) {
        const found = cls.students?.find((s: any) => s.studentId === id);
        if (found) return { className: cls.className, ...found };
      }
      return null;
    }),
    enabled: !!id,
  });

  const { data: gradeData } = useQuery({
    queryKey: ['studentGrades', id],
    queryFn: () => api.get(`/reports/grades/recap`).then((r) => {
      for (const cls of (r.data?.byClass || [])) {
        const found = cls.students?.find((s: any) => s.studentId === id);
        if (found) return { className: cls.className, assessments: cls.assessments, ...found };
      }
      return null;
    }),
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
      return api.patch(`/students/${id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      toast.success('Foto berhasil diunggah');
    },
    onError: () => toast.error('Gagal mengunggah foto'),
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) photoUploadMutation.mutate(file);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Santri tidak ditemukan</p>
        <Link to="/students"><Button variant="outline" className="mt-4">Kembali</Button></Link>
      </div>
    );
  }

  const currentClass = student.classHistories?.[0]?.class;
  const currentLevel = currentClass?.level?.name;
  const photoUrl = student.photo ? `${api.defaults.baseURL?.replace('/api', '')}/uploads/${student.photo}` : null;

  return (
    <div className="space-y-6 print:space-y-2">
      {/* Header - hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link to="/students"><Button variant="ghost" size="icon"><ArrowLeft size={20} /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{student.fullName}</h1>
            <p className="text-muted-foreground">{student.studentNumber} • {currentLevel} {currentClass?.name || '-'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Cetak</Button>
        </div>
      </div>

      {/* ── Print Header ── */}
      <PrintHeader title="Biodata Santri" />

      {/* Photo + Status */}
      <Card className="print:border print:shadow-none">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Photo — larger for print */}
            <div className="relative group shrink-0">
              <div
                className="rounded-xl border-2 border-dashed overflow-hidden bg-muted flex items-center justify-center"
                style={{ width: 120, height: 150 }}
              >
                {photoUrl ? (
                  <img src={photoUrl} alt={student.fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center">
                    <User className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="text-[9px] text-muted-foreground mt-1">Foto</p>
                  </div>
                )}
              </div>
              {/* Upload overlay — hidden on print */}
              <button
                className="print:hidden absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-6 w-6 text-white mb-1" />
                <span className="text-[10px] text-white font-medium">
                  {photoUploadMutation.isPending ? 'Uploading...' : 'Ubah Foto'}
                </span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              {/* Print-only student number below photo */}
              <div className="hidden print:block text-center mt-1">
                <p className="text-[8px] text-gray-500">{student.studentNumber}</p>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xl font-bold">{student.fullName}</h2>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(student.status)}`}>
                  {formatStatus(student.status)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">No Induk: </span><span className="font-medium">{student.studentNumber}</span></div>
                <div><span className="text-muted-foreground">Gender: </span><span className="font-medium">{formatGender(student.gender)}</span></div>
                <div><span className="text-muted-foreground">Kelas: </span><span className="font-medium">{currentLevel} {currentClass?.name || '-'}</span></div>
                <div><span className="text-muted-foreground">NIK: </span><span className="font-medium">{student.nik || '-'}</span></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="biodata" className="w-full">
        <TabsList className="print:hidden">
          <TabsTrigger value="biodata">Biodata</TabsTrigger>
          <TabsTrigger value="parents">Orang Tua</TabsTrigger>
          <TabsTrigger value="classes">Kelas</TabsTrigger>
          <TabsTrigger value="attendance">Kehadiran</TabsTrigger>
          <TabsTrigger value="grades">Nilai</TabsTrigger>
          <TabsTrigger value="documents">Dokumen</TabsTrigger>
        </TabsList>

        <TabsContent value="biodata">
          <Card className="print:border print:shadow-none">
            <CardHeader><CardTitle className="text-base">Data Diri</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:gap-2">
                {[
                  ['Nomor Induk', student.studentNumber],
                  ['NIK', student.nik],
                  ['NISN', student.nisn],
                  ['Jenis Kelamin', formatGender(student.gender)],
                  ['Tempat Lahir', student.birthPlace],
                  ['Tanggal Lahir', formatDate(student.birthDate)],
                  ['Alamat', student.address],
                  ['Desa/Kelurahan', student.village],
                  ['Kecamatan', student.district],
                  ['Kabupaten', student.regency],
                  ['Provinsi', student.province],
                  ['No. KK', student.kkNumber],
                  ['Kode Pos', student.postalCode],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="font-medium">{value || '-'}</p>
                  </div>
                ))}
                {student.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Catatan</p>
                    <p className="font-medium">{student.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parents">
          <Card className="print:border print:shadow-none">
            <CardHeader><CardTitle className="text-base">Data Orang Tua</CardTitle></CardHeader>
            <CardContent>
              {student.parents?.length > 0 ? (
                <div className="space-y-4">
                  {student.parents.map((parent: any) => (
                    <div key={parent.id} className="rounded-lg border p-4">
                      <h4 className="font-medium mb-2">{parent.relationship === 'FATHER' ? '🧑 Ayah' : '👩 Ibu'}</h4>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
                        <div><p className="text-muted-foreground">Nama</p><p className="font-medium">{parent.name}</p></div>
                        <div><p className="text-muted-foreground">NIK</p><p className="font-medium">{parent.nik || '-'}</p></div>
                        <div><p className="text-muted-foreground">Telepon</p><p className="font-medium">{parent.phone || '-'}</p></div>
                        <div><p className="text-muted-foreground">Pekerjaan</p><p className="font-medium">{parent.occupation || '-'}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">Belum ada data orang tua</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes">
          <Card className="print:border print:shadow-none">
            <CardHeader><CardTitle className="text-base">Riwayat Kelas</CardTitle></CardHeader>
            <CardContent>
              {student.classHistories?.length > 0 ? (
                <div className="space-y-2">
                  {student.classHistories.map((history: any) => (
                    <div key={history.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{history.class?.level?.name} {history.class?.name}</p>
                        <p className="text-sm text-muted-foreground">{history.academicYear?.name}</p>
                      </div>
                      <Badge variant={history.status === 'ACTIVE' ? 'default' : 'secondary'}>{formatStatus(history.status)}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">Belum ada riwayat kelas</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card className="print:border print:shadow-none">
            <CardHeader>
              <CardTitle className="text-base">
                Rekap Kehadiran {attendanceData ? `- ${attendanceData.className}` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950">
                      <p className="text-2xl font-bold text-green-600">{attendanceData.PRESENT}</p>
                      <p className="text-xs text-muted-foreground">Hadir</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                      <p className="text-2xl font-bold text-yellow-600">{attendanceData.SICK}</p>
                      <p className="text-xs text-muted-foreground">Sakit</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                      <p className="text-2xl font-bold text-blue-600">{attendanceData.PERMISSION}</p>
                      <p className="text-xs text-muted-foreground">Izin</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950">
                      <p className="text-2xl font-bold text-red-600">{attendanceData.ABSENT}</p>
                      <p className="text-xs text-muted-foreground">Alpa</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <Badge variant={attendanceData.attendanceRate >= 80 ? 'default' : 'destructive'} className="text-lg px-4 py-1">
                      Rate Kehadiran: {attendanceData.attendanceRate}%
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">Belum ada data kehadiran</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades">
          <Card className="print:border print:shadow-none">
            <CardHeader>
              <CardTitle className="text-base">
                Rekap Nilai {gradeData ? `- ${gradeData.className}` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {gradeData?.scores?.length > 0 ? (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Penilaian</TableHead>
                        <TableHead>Komponen</TableHead>
                        <TableHead className="text-center">Nilai</TableHead>
                        <TableHead className="text-center">Max</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradeData.scores.map((s: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-medium">{s.assessmentTitle}</TableCell>
                          <TableCell>{s.componentName}</TableCell>
                          <TableCell className="text-center font-bold">{s.score}</TableCell>
                          <TableCell className="text-center">{s.maxScore}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 text-center">
                    <Badge className="text-lg px-4 py-1">Rata-rata: {gradeData.averageScore}</Badge>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">Belum ada data nilai</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="print:border print:shadow-none">
            <CardHeader><CardTitle className="text-base">Dokumen</CardTitle></CardHeader>
            <CardContent>
              {student.documents?.length > 0 ? (
                <div className="space-y-2">
                  {student.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                      </div>
                      <Button variant="outline" size="sm">Download</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">Belum ada dokumen</p>
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
