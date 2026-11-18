import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { FileSpreadsheet, Printer } from 'lucide-react';
import { toast } from 'sonner';

export function LegerPage() {
  const [yearId, setYearId] = useState('');
  const [semester, setSemester] = useState<'SATU' | 'DUA'>('SATU');
  const [classId, setClassId] = useState('');
  const [exporting, setExporting] = useState(false);

  // Print in landscape while this page is mounted
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'leger-print-style';
    style.textContent = '@page { size: A4 landscape; margin: 10mm; }';
    document.head.appendChild(style);
    return () => {
      document.getElementById('leger-print-style')?.remove();
    };
  }, []);

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
  const classesList: any[] = Array.isArray(classes) ? classes : [];

  const legerEnabled = !!classId;
  const { data: leger, isFetching } = useQuery({
    queryKey: ['leger', classId, yearId, semester],
    queryFn: () =>
      api
        .get('/reports/leger', { params: { classId, academicYearId: yearId, semester } })
        .then((r) => r.data),
    enabled: legerEnabled,
  });

  const handleExport = async () => {
    if (!classId) return;
    setExporting(true);
    try {
      const res = await api.get('/reports/leger/export', {
        params: { classId, academicYearId: yearId, semester },
        responseType: 'blob',
      });
      const disposition: string = res.headers['content-disposition'] ?? '';
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? 'Leger.xlsx';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Leger berhasil diekspor');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal mengekspor leger');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Leger Nilai</h1>
          <p className="text-muted-foreground">Rekap nilai santri per kelas dan semester</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={handleExport} disabled={!classId || exporting}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {exporting ? 'Mengekspor...' : 'Ekspor Excel'}
          </Button>
          <Button onClick={() => window.print()} disabled={!leger}>
            <Printer className="mr-2 h-4 w-4" /> Cetak
          </Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardContent className="grid gap-4 p-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Tahun Ajaran</Label>
            <Select value={yearId} onValueChange={(v) => { setYearId(v); setClassId(''); }}>
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
            <Select value={semester} onValueChange={(v: 'SATU' | 'DUA') => { setSemester(v); setClassId(''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SATU">Semester 1</SelectItem>
                <SelectItem value="DUA">Semester 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Kelas</Label>
            <Select value={classId} onValueChange={setClassId} disabled={!yearId}>
              <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
              <SelectContent>
                {classesList.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {legerEnabled && isFetching && !leger && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Memuat leger...</CardContent></Card>
      )}

      {leger && (
        <Card className="print:border-0 print:shadow-none">
          <CardContent className="p-4">
            <div className="mb-3 text-center print:mb-4">
              <h2 className="text-lg font-bold uppercase">Leger Nilai Santri</h2>
              <p className="text-sm">
                {leger.class.name} ({leger.class.level}) — {leger.academicYear.name} —{' '}
                {leger.academicYear.semester === 'DUA' ? 'Semester 2' : 'Semester 1'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="border px-2 py-1.5">No</TableHead>
                    <TableHead className="border px-2 py-1.5">NIS</TableHead>
                    <TableHead className="border px-2 py-1.5 min-w-40">Nama Santri</TableHead>
                    {leger.subjects.map((s: any) => (
                      <TableHead key={s.id} className="border px-2 py-1.5 text-center">{s.name}</TableHead>
                    ))}
                    <TableHead className="border px-2 py-1.5 text-center">Rata²</TableHead>
                    <TableHead className="border px-2 py-1.5 text-center">Predikat</TableHead>
                    <TableHead className="border px-2 py-1.5 text-center">Peringkat</TableHead>
                    <TableHead className="border px-2 py-1.5 text-center">H</TableHead>
                    <TableHead className="border px-2 py-1.5 text-center">S</TableHead>
                    <TableHead className="border px-2 py-1.5 text-center">I</TableHead>
                    <TableHead className="border px-2 py-1.5 text-center">A</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leger.students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8 + leger.subjects.length} className="h-24 text-center text-muted-foreground">
                        Tidak ada santri aktif di kelas ini
                      </TableCell>
                    </TableRow>
                  )}
                  {leger.students.map((s: any, i: number) => (
                    <TableRow key={s.student.id}>
                      <TableCell className="border px-2 py-1.5">{i + 1}</TableCell>
                      <TableCell className="border px-2 py-1.5 font-mono">{s.student.studentNumber}</TableCell>
                      <TableCell className="border px-2 py-1.5 font-medium">{s.student.fullName}</TableCell>
                      {leger.subjects.map((subj: any) => {
                        const val = s.subjectAverages.find((a: any) => a.subjectId === subj.id)?.average;
                        return (
                          <TableCell key={subj.id} className="border px-2 py-1.5 text-center">
                            {val ?? '-'}
                          </TableCell>
                        );
                      })}
                      <TableCell className="border px-2 py-1.5 text-center font-semibold">{s.finalAverage ?? '-'}</TableCell>
                      <TableCell className="border px-2 py-1.5 text-center">{s.letterGrade}</TableCell>
                      <TableCell className="border px-2 py-1.5 text-center">{s.rank ?? '-'}</TableCell>
                      <TableCell className="border px-2 py-1.5 text-center">{s.attendance.PRESENT}</TableCell>
                      <TableCell className="border px-2 py-1.5 text-center">{s.attendance.SICK}</TableCell>
                      <TableCell className="border px-2 py-1.5 text-center">{s.attendance.PERMISSION}</TableCell>
                      <TableCell className="border px-2 py-1.5 text-center">{s.attendance.ABSENT}</TableCell>
                    </TableRow>
                  ))}
                  {leger.students.length > 0 && (
                    <TableRow className="bg-muted font-semibold">
                      <TableCell colSpan={3} className="border px-2 py-1.5">Rata-rata Kelas</TableCell>
                      {leger.subjects.map((s: any) => (
                        <TableCell key={s.id} className="border px-2 py-1.5" />
                      ))}
                      <TableCell className="border px-2 py-1.5 text-center">{leger.classAverage ?? '-'}</TableCell>
                      <TableCell colSpan={6} className="border px-2 py-1.5" />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {legerEnabled && leger && leger.students.length === 0 && (
        <Card className="print:hidden">
          <CardContent className="py-6 text-center text-muted-foreground">
            Belum ada penilaian pada kelas/semester ini
          </CardContent>
        </Card>
      )}

      {!legerEnabled && (
        <Card className="print:hidden">
          <CardContent className="py-10 text-center text-muted-foreground">
            Pilih kelas untuk menampilkan leger nilai
          </CardContent>
        </Card>
      )}
    </div>
  );
}
