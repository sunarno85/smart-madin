import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Printer } from 'lucide-react';
import { formatDateShort } from '../lib/utils';

function RaporHeader({ schoolName, schoolAddress }: { schoolName: string; schoolAddress: string }) {
  return (
    <div className="border-b-2 border-black pb-3 text-center">
      <h2 className="text-lg font-bold uppercase">{schoolName || 'MADRASAH DINIYAH'}</h2>
      <p className="text-xs">{schoolAddress}</p>
      <h3 className="mt-2 text-base font-bold uppercase">Laporan Hasil Belajar Santri</h3>
    </div>
  );
}

export function RaporPage() {
  const [yearId, setYearId] = useState('');
  const [semester, setSemester] = useState<'SATU' | 'DUA'>('SATU');
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');

  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => api.get('/academic-years').then((r) => r.data),
  });

  useEffect(() => {
    if (!years?.length || yearId) return;
    const active = years.find((y: any) => y.isActive) ?? years[0];
    if (active) {
      setYearId(active.id);
      setSemester(active.activeSemester ?? 'SATU');
    }
  }, [years, yearId]);

  const { data: classes } = useQuery({
    queryKey: ['classes', yearId],
    queryFn: () => api.get('/classes', { params: { academicYearId: yearId } }).then((r) => r.data),
    enabled: !!yearId,
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students-by-class', classId, yearId],
    queryFn: () =>
      api
        .get('/students', { params: { classId, academicYearId: yearId, pageSize: 200 } })
        .then((r) => r.data?.data ?? r.data),
    enabled: !!classId,
  });
  const students: any[] = Array.isArray(studentsData) ? studentsData : (studentsData?.data ?? []);

  const { data: school } = useQuery({
    queryKey: ['school-profile'],
    queryFn: () => api.get('/school/profile').then((r) => r.data),
  });

  const raporEnabled = !!studentId;
  const { data: rapor, isFetching } = useQuery({
    queryKey: ['rapor', studentId, yearId, semester],
    queryFn: () =>
      api
        .get(`/reports/rapor/${studentId}`, { params: { academicYearId: yearId, semester } })
        .then((r) => r.data),
    enabled: raporEnabled,
  });

  const classesList: any[] = Array.isArray(classes) ? classes : [];

  return (
    <div className="space-y-6">
      {/* Filters - hidden when printing */}
      <Card className="print:hidden">
        <CardContent className="grid gap-4 p-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Tahun Ajaran</Label>
            <Select value={yearId} onValueChange={(v) => { setYearId(v); setClassId(''); setStudentId(''); }}>
              <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>
                {(years ?? []).map((y: any) => (
                  <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Semester</Label>
            <Select value={semester} onValueChange={(v: 'SATU' | 'DUA') => { setSemester(v); setStudentId(''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SATU">Semester 1</SelectItem>
                <SelectItem value="DUA">Semester 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Kelas</Label>
            <Select value={classId} onValueChange={(v) => { setClassId(v); setStudentId(''); }} disabled={!yearId}>
              <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
              <SelectContent>
                {classesList.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Santri</Label>
            <Select value={studentId} onValueChange={setStudentId} disabled={!classId}>
              <SelectTrigger><SelectValue placeholder="Pilih santri" /></SelectTrigger>
              <SelectContent>
                {students.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {raporEnabled && isFetching && !rapor && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Memuat rapor...</CardContent></Card>
      )}

      {rapor && (
        <>
          <div className="flex justify-end print:hidden">
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Cetak Rapor
            </Button>
          </div>

          <Card className="mx-auto max-w-3xl print:max-w-none print:border-0 print:shadow-none">
            <CardContent className="space-y-5 p-6">
              <RaporHeader
                schoolName={school?.name ?? 'MADRASAH DINIYAH'}
                schoolAddress={[school?.village, school?.district, school?.regency].filter(Boolean).join(', ')}
              />

              {/* Identity */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div className="flex"><span className="w-32">Nama Santri</span><span>: <strong>{rapor.student.fullName}</strong></span></div>
                <div className="flex"><span className="w-32">Kelas</span><span>: {rapor.class.name} ({rapor.class.level})</span></div>
                <div className="flex"><span className="w-32">NIS</span><span>: {rapor.student.studentNumber}</span></div>
                <div className="flex"><span className="w-32">Tahun Ajaran</span><span>: {rapor.academicYear.name}</span></div>
                <div className="flex"><span className="w-32">NISN</span><span>: {rapor.student.nisn || '-'}</span></div>
                <div className="flex"><span className="w-32">Semester</span><span>: {rapor.academicYear.semester === 'DUA' ? '2 (Genap)' : '1 (Ganjil)'}</span></div>
              </div>

              {/* Grades */}
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border px-2 py-1.5 text-left">No</th>
                    <th className="border px-2 py-1.5 text-left">Mata Pelajaran</th>
                    <th className="border px-2 py-1.5 text-center w-20">Nilai</th>
                    <th className="border px-2 py-1.5 text-center w-16">Predikat</th>
                    <th className="border px-2 py-1.5 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {rapor.subjects.length === 0 && (
                    <tr>
                      <td colSpan={5} className="border px-2 py-4 text-center text-muted-foreground">
                        Belum ada penilaian pada semester ini
                      </td>
                    </tr>
                  )}
                  {rapor.subjects.map((s: any, i: number) => (
                    <tr key={s.subjectId}>
                      <td className="border px-2 py-1.5">{i + 1}</td>
                      <td className="border px-2 py-1.5">
                        {s.subjectName}
                        {s.subjectNameArabic && <span className="mr-2 block text-xs text-muted-foreground" dir="rtl">{s.subjectNameArabic}</span>}
                      </td>
                      <td className="border px-2 py-1.5 text-center font-medium">{s.average ?? '-'}</td>
                      <td className="border px-2 py-1.5 text-center">{s.letterGrade}</td>
                      <td className="border px-2 py-1.5 text-xs">{s.predicate}</td>
                    </tr>
                  ))}
                  {rapor.subjects.length > 0 && (
                    <tr className="bg-muted font-semibold">
                      <td colSpan={2} className="border px-2 py-1.5">Rata-rata Keseluruhan</td>
                      <td className="border px-2 py-1.5 text-center">{rapor.overall.average ?? '-'}</td>
                      <td className="border px-2 py-1.5 text-center">{rapor.overall.letterGrade}</td>
                      <td className="border px-2 py-1.5 text-xs">{rapor.overall.predicate}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Attendance */}
              <div>
                <h4 className="mb-2 text-sm font-bold">Presensi</h4>
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div className="rounded border px-2 py-1.5"><div className="font-bold">{rapor.attendance.totalSessions}</div><div className="text-xs text-muted-foreground">Total Sesi</div></div>
                  <div className="rounded border px-2 py-1.5"><div className="font-bold text-green-600">{rapor.attendance.PRESENT}</div><div className="text-xs text-muted-foreground">Hadir</div></div>
                  <div className="rounded border px-2 py-1.5"><div className="font-bold text-amber-600">{rapor.attendance.SICK + rapor.attendance.PERMISSION}</div><div className="text-xs text-muted-foreground">Sakit/Izin</div></div>
                  <div className="rounded border px-2 py-1.5"><div className="font-bold text-red-600">{rapor.attendance.ABSENT}</div><div className="text-xs text-muted-foreground">Alpa</div></div>
                </div>
              </div>

              {/* Signature */}
              <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
                <div>
                  <p className="mb-12">Orang Tua / Wali,</p>
                  <p className="border-t pt-1">(..............................)</p>
                </div>
                <div className="text-right">
                  <p className="mb-12">
                    {school?.district || school?.regency || '...............'}, {formatDateShort(new Date())}
                  </p>
                  <p className="mb-1">Kepala Madrasah,</p>
                  <p className="border-t pt-1">{school?.principalName || '(..............................)'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!raporEnabled && (
        <Card className="print:hidden">
          <CardContent className="py-10 text-center text-muted-foreground">
            Pilih kelas dan santri untuk menampilkan rapor
          </CardContent>
        </Card>
      )}
    </div>
  );
}
