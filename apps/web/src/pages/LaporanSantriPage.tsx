import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { PrintHeader, PrintFooter } from '../components/PrintHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Download, Users, GraduationCap, ClipboardCheck, Printer } from 'lucide-react';

export function LaporanSantriPage() {
  const [activeTab, setActiveTab] = useState('stats');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: () => api.get('/school/profile').then((r) => r.data),
  });

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academicYears'],
    queryFn: () => api.get('/academic-years').then((r) => r.data?.data || r.data || []),
  });
  const activeYear = academicYears.find((y: any) => y.isActive);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data?.data || r.data || []),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/subjects').then((r) => r.data?.data || r.data || []),
  });

  // Student Stats
  const { data: studentStats } = useQuery({
    queryKey: ['studentStats', activeYear?.id],
    queryFn: () => api.get('/reports/students/stats', { params: { academicYearId: activeYear?.id } }).then((r) => r.data),
    enabled: !!activeYear,
  });

  // Attendance Recap
  const { data: attendanceRecap } = useQuery({
    queryKey: ['attendanceRecap', activeYear?.id, classFilter],
    queryFn: () => {
      const params: any = { academicYearId: activeYear?.id };
      if (classFilter !== 'all') params.classId = classFilter;
      return api.get('/reports/attendance/recap', { params }).then((r) => r.data);
    },
    enabled: !!activeYear,
  });

  // Grade Recap
  const { data: gradeRecap } = useQuery({
    queryKey: ['gradeRecap', activeYear?.id, classFilter, subjectFilter],
    queryFn: () => {
      const params: any = { academicYearId: activeYear?.id };
      if (classFilter !== 'all') params.classId = classFilter;
      if (subjectFilter !== 'all') params.subjectId = subjectFilter;
      return api.get('/reports/grades/recap', { params }).then((r) => r.data);
    },
    enabled: !!activeYear,
  });

  // ─── PDF Generators ───
  const generateStudentStatsPDF = () => {
    if (!studentStats) return;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text('LAPORAN STATISTIK SANTRI', pageW / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Tahun Ajaran ${activeYear?.name || '-'}`, pageW / 2, 22, { align: 'center' });

    let y = 32;
    doc.setFontSize(11);
    doc.text('Ringkasan:', 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Total Santri: ${studentStats.totalStudents}`, 14, y); y += 6;
    doc.text(`Santri Aktif: ${studentStats.activeStudents}`, 14, y); y += 6;
    doc.text(`Laki-laki: ${studentStats.byGender?.MALE || 0}`, 14, y); y += 6;
    doc.text(`Perempuan: ${studentStats.byGender?.FEMALE || 0}`, 14, y); y += 12;

    autoTable(doc, {
      startY: y,
      head: [['No', 'No Induk', 'Nama', 'L/P', 'Kelas', 'Jenjang', 'Status']],
      body: studentStats.students.map((s: any, i: number) => [
        i + 1,
        s.studentNumber,
        s.fullName,
        s.gender === 'MALE' ? 'L' : 'P',
        s.className,
        s.levelName,
        s.status === 'ACTIVE' ? 'Aktif' : s.status,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save('laporan-statistik-santri.pdf');
  };

  const generateAttendancePDF = () => {
    if (!attendanceRecap) return;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text('LAPORAN REKAP KEHADIRAN', pageW / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Tahun Ajaran ${activeYear?.name || '-'}`, pageW / 2, 22, { align: 'center' });

    let y = 32;
    doc.setFontSize(11);
    doc.text('Ringkasan:', 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Total Sesi: ${attendanceRecap.summary.totalSessions}`, 14, y); y += 6;
    doc.text(`Hadir: ${attendanceRecap.summary.totalPresent} (${attendanceRecap.summary.attendanceRate}%)`, 14, y); y += 6;
    doc.text(`Sakit: ${attendanceRecap.summary.totalSick}`, 14, y); y += 6;
    doc.text(`Izin: ${attendanceRecap.summary.totalPermission}`, 14, y); y += 6;
    doc.text(`Alpa: ${attendanceRecap.summary.totalAbsent}`, 14, y); y += 12;

    for (const cls of attendanceRecap.byClass) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.text(`${cls.className} (${cls.levelName}) - ${cls.totalSessions} sesi`, 14, y);
      y += 7;

      autoTable(doc, {
        startY: y,
        head: [['No', 'Nama', 'No Induk', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Rate']],
        body: cls.students.map((s: any, i: number) => [
          i + 1,
          s.studentName,
          s.studentNumber,
          s.PRESENT,
          s.SICK,
          s.PERMISSION,
          s.ABSENT,
          `${s.attendanceRate}%`,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    doc.save('laporan-rekap-kehadiran.pdf');
  };

  const generateGradePDF = () => {
    if (!gradeRecap) return;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text('LAPORAN REKAP NILAI', pageW / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Tahun Ajaran ${activeYear?.name || '-'}`, pageW / 2, 22, { align: 'center' });

    let y = 32;

    for (const cls of gradeRecap.byClass) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.text(`${cls.className} (${cls.levelName}) - ${cls.totalAssessments} penilaian`, 14, y);
      y += 7;

      autoTable(doc, {
        startY: y,
        head: [['No', 'Nama', 'No Induk', 'Rata-rata Nilai']],
        body: cls.students.map((s: any, i: number) => [
          i + 1,
          s.studentName,
          s.studentNumber,
          s.averageScore,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [147, 51, 234] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    doc.save('laporan-rekap-nilai.pdf');
  };

  // Tab titles for print
  const tabTitles: Record<string, string> = {
    stats: 'Statistik Santri',
    attendance: 'Rekap Kehadiran',
    grades: 'Rekap Nilai',
  };

  return (
    <div className="space-y-6 print:space-y-0">
      {/* ── App Header (hidden on print) ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Laporan Santri</h1>
          <p className="text-muted-foreground">Statistik, kehadiran, dan rekap nilai santri</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Cetak</Button>
          <Badge variant="outline" className="text-sm">{activeYear?.name || 'Tahun Ajaran Aktif'}</Badge>
        </div>
      </div>

      {/* ── Print Header ── */}
      <PrintHeader
        title={`Laporan Santri — ${tabTitles[activeTab]}`}
        subtitle={`Tahun Ajaran ${activeYear?.name || '-'}${classFilter !== 'all' ? ` — Kelas: ${classes.find((c: any) => c.id === classFilter)?.name || ''}` : ''}${subjectFilter !== 'all' ? ` — Mapel: ${subjects.find((s: any) => s.id === subjectFilter)?.name || ''}` : ''}`}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 print:hidden">
          <TabsTrigger value="stats" className="gap-2"><Users className="h-4 w-4" /> Statistik</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2"><ClipboardCheck className="h-4 w-4" /> Kehadiran</TabsTrigger>
          <TabsTrigger value="grades" className="gap-2"><GraduationCap className="h-4 w-4" /> Nilai</TabsTrigger>
        </TabsList>

        {/* ── Student Statistics ── */}
        <TabsContent value="stats" className="space-y-4">
          <div className="flex justify-end print:hidden">
            <Button onClick={generateStudentStatsPDF} className="gap-2" disabled={!studentStats}>
              <Download className="h-4 w-4" /> Export PDF
            </Button>
          </div>
          {studentStats && (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 print:grid-cols-4 print:gap-2">
                <Card className="print:border print:border-gray-300 print:shadow-none">
                  <CardContent className="p-4 print:p-2">
                    <p className="text-sm text-muted-foreground print:text-gray-500 print:text-[10px]">Total Santri</p>
                    <p className="text-2xl font-bold print:text-xl">{studentStats.totalStudents}</p>
                  </CardContent>
                </Card>
                <Card className="print:border print:border-gray-300 print:shadow-none">
                  <CardContent className="p-4 print:p-2">
                    <p className="text-sm text-muted-foreground print:text-gray-500 print:text-[10px]">Santri Aktif</p>
                    <p className="text-2xl font-bold text-green-600 print:text-xl print:text-green-800">{studentStats.activeStudents}</p>
                  </CardContent>
                </Card>
                <Card className="print:border print:border-gray-300 print:shadow-none">
                  <CardContent className="p-4 print:p-2">
                    <p className="text-sm text-muted-foreground print:text-gray-500 print:text-[10px]">Laki-laki</p>
                    <p className="text-2xl font-bold text-blue-600 print:text-xl print:text-blue-800">{studentStats.byGender?.MALE || 0}</p>
                  </CardContent>
                </Card>
                <Card className="print:border print:border-gray-300 print:shadow-none">
                  <CardContent className="p-4 print:p-2">
                    <p className="text-sm text-muted-foreground print:text-gray-500 print:text-[10px]">Perempuan</p>
                    <p className="text-2xl font-bold text-pink-600 print:text-xl print:text-pink-800">{studentStats.byGender?.FEMALE || 0}</p>
                  </CardContent>
                </Card>
              </div>

              {/* By Level */}
              {Object.keys(studentStats.byLevel || {}).length > 0 && (
                <Card className="print:border print:border-gray-300 print:shadow-none">
                  <CardHeader className="print:pb-1"><CardTitle className="text-base print:text-sm">Per Jenjang</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex gap-4 flex-wrap print:gap-2">
                      {Object.entries(studentStats.byLevel).map(([level, count]) => (
                        <div key={level} className="flex items-center gap-2">
                          <Badge variant="secondary" className="print:bg-blue-50 print:text-blue-800 print:border-blue-200 print:text-[10px]">{level}</Badge>
                          <span className="font-bold">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Student List */}
              <Card className="print:border print:border-gray-300 print:shadow-none">
                <CardHeader className="print-section-header print:pb-1 print:mb-0"><CardTitle className="text-base print:text-sm">Daftar Santri ({studentStats.students.length})</CardTitle></CardHeader>
                <CardContent className="print:p-0 print-section-content">
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="print:bg-blue-50">
                          <TableHead className="print:text-9px print:px-2 print:py-1">No</TableHead>
                          <TableHead className="print:text-9px print:px-2 print:py-1">No Induk</TableHead>
                          <TableHead className="print:text-9px print:px-2 print:py-1">Nama</TableHead>
                          <TableHead className="print:text-9px print:px-2 print:py-1">L/P</TableHead>
                          <TableHead className="print:text-9px print:px-2 print:py-1">Kelas</TableHead>
                          <TableHead className="print:text-9px print:px-2 print:py-1">Jenjang</TableHead>
                          <TableHead className="print:text-9px print:px-2 print:py-1">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentStats.students.map((s: any, i: number) => (
                          <TableRow key={s.id} className="print:py-0 print:border-b print:border-gray-100">
                            <TableCell className="print:text-9px print:px-2 print:py-0.5">{i + 1}</TableCell>
                            <TableCell className="font-mono print:text-9px print:px-2 print:py-0.5">{s.studentNumber}</TableCell>
                            <TableCell className="font-medium print:text-9px print:px-2 print:py-0.5">{s.fullName}</TableCell>
                            <TableCell className="print:text-9px print:px-2 print:py-0.5">{s.gender === 'MALE' ? 'L' : 'P'}</TableCell>
                            <TableCell className="print:text-9px print:px-2 print:py-0.5">{s.className}</TableCell>
                            <TableCell className="print:text-9px print:px-2 print:py-0.5">{s.levelName}</TableCell>
                            <TableCell className="print:text-9px print:px-2 print:py-0.5">
                              <Badge variant={s.status === 'ACTIVE' ? 'default' : 'secondary'} className="print:bg-green-50 print:text-green-800 print:border-green-200 print:text-9px">
                                {s.status === 'ACTIVE' ? 'Aktif' : s.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Attendance Recap ── */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div className="flex gap-3">
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Cetak</Button>
              <Button onClick={generateAttendancePDF} className="gap-2" disabled={!attendanceRecap}>
                <Download className="h-4 w-4" /> Export PDF
              </Button>
            </div>
          </div>

          {attendanceRecap && (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5 print:grid-cols-5 print:gap-2">
                <Card className="print:border print:border-gray-300 print:shadow-none">
                  <CardContent className="p-4 print:p-2">
                    <p className="text-sm text-muted-foreground print:text-gray-500 print:text-[10px]">Total Sesi</p>
                    <p className="text-2xl font-bold print:text-xl">{attendanceRecap.summary.totalSessions}</p>
                  </CardContent>
                </Card>
                <Card className="print:border print:border-gray-300 print:shadow-none">
                  <CardContent className="p-4 print:p-2">
                    <p className="text-sm text-muted-foreground print:text-gray-500 print:text-[10px]">Rate Kehadiran</p>
                    <p className="text-2xl font-bold text-green-600 print:text-xl print:text-green-800">{attendanceRecap.summary.attendanceRate}%</p>
                  </CardContent>
                </Card>
                <Card className="print:border print:border-gray-300 print:shadow-none">
                  <CardContent className="p-4 print:p-2">
                    <p className="text-sm text-muted-foreground print:text-gray-500 print:text-[10px]">Hadir</p>
                    <p className="text-2xl font-bold print:text-xl">{attendanceRecap.summary.totalPresent}</p>
                  </CardContent>
                </Card>
                <Card className="print:border print:border-gray-300 print:shadow-none">
                  <CardContent className="p-4 print:p-2">
                    <p className="text-sm text-muted-foreground print:text-gray-500 print:text-[10px]">Sakit + Izin</p>
                    <p className="text-2xl font-bold print:text-xl">{attendanceRecap.summary.totalSick + attendanceRecap.summary.totalPermission}</p>
                  </CardContent>
                </Card>
                <Card className="print:border print:border-gray-300 print:shadow-none">
                  <CardContent className="p-4 print:p-2">
                    <p className="text-sm text-muted-foreground print:text-gray-500 print:text-[10px]">Alpa</p>
                    <p className="text-2xl font-bold text-red-600 print:text-xl print:text-red-800">{attendanceRecap.summary.totalAbsent}</p>
                  </CardContent>
                </Card>
              </div>

              {attendanceRecap.byClass.map((cls: any) => (
                <Card key={cls.classId} className="print:border print:border-gray-300 print:shadow-none">
                  <CardHeader className="print-section-header print:pb-1 print:mb-0">
                    <CardTitle className="text-base print:text-sm">
                      {cls.className} <Badge variant="secondary" className="ml-2 print:bg-blue-50 print:text-blue-800 print:border-blue-200 print:text-[10px]">{cls.levelName}</Badge>
                      <span className="ml-2 text-sm font-normal text-muted-foreground print:text-gray-500 print:text-[10px]">({cls.totalSessions} sesi, {cls.totalStudents} santri)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="print:bg-green-50">
                            <TableHead className="print:text-[10px]">No</TableHead>
                            <TableHead className="print:text-[10px]">Nama</TableHead>
                            <TableHead className="print:text-[10px]">No Induk</TableHead>
                            <TableHead className="text-center print:text-[10px]">Hadir</TableHead>
                            <TableHead className="text-center print:text-[10px]">Sakit</TableHead>
                            <TableHead className="text-center print:text-[10px]">Izin</TableHead>
                            <TableHead className="text-center print:text-[10px]">Alpa</TableHead>
                            <TableHead className="text-center print:text-[10px]">Rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cls.students.map((s: any, i: number) => (
                          <TableRow key={s.studentId} className="print:py-0 print:border-b print:border-gray-100">
                            <TableCell className="print:text-9px print:px-2 print:py-0.5">{i + 1}</TableCell>
                            <TableCell className="font-medium print:text-9px print:px-2 print:py-0.5">{s.studentName}</TableCell>
                            <TableCell className="font-mono print:text-9px print:px-2 print:py-0.5">{s.studentNumber}</TableCell>
                            <TableCell className="text-center text-green-600 font-medium print:text-green-800 print:text-9px print:px-2 print:py-0.5">{s.PRESENT}</TableCell>
                            <TableCell className="text-center print:text-9px print:px-2 print:py-0.5">{s.SICK}</TableCell>
                            <TableCell className="text-center print:text-9px print:px-2 print:py-0.5">{s.PERMISSION}</TableCell>
                            <TableCell className="text-center text-red-600 font-medium print:text-red-800 print:text-9px print:px-2 print:py-0.5">{s.ABSENT}</TableCell>
                            <TableCell className="text-center print:text-9px print:px-2 print:py-0.5">
                              <Badge variant={s.attendanceRate >= 80 ? 'default' : s.attendanceRate >= 50 ? 'secondary' : 'destructive'} className="print:text-9px">
                                  {s.attendanceRate}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        {/* ── Grade Recap ── */}
        <TabsContent value="grades" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div className="flex gap-3">
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Mapel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Mapel</SelectItem>
                  {subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Cetak</Button>
              <Button onClick={generateGradePDF} className="gap-2" disabled={!gradeRecap}>
                <Download className="h-4 w-4" /> Export PDF
              </Button>
            </div>
          </div>

          {gradeRecap && (
            <>
              {gradeRecap.byClass.length === 0 ? (
                <Card className="print:border print:border-gray-300 print:shadow-none">
                  <CardContent className="py-12 text-center text-muted-foreground print:text-gray-500 print:text-sm">
                    Belum ada data penilaian
                  </CardContent>
                </Card>
              ) : (
                gradeRecap.byClass.map((cls: any) => (
                  <Card key={cls.classId} className="print:border print:border-gray-300 print:shadow-none">
                    <CardHeader className="print-section-header print:pb-1 print:mb-0">
                      <CardTitle className="text-base print:text-sm">
                        {cls.className} <Badge variant="secondary" className="ml-2 print:bg-purple-50 print:text-purple-800 print:border-purple-200 print:text-[10px]">{cls.levelName}</Badge>
                        <span className="ml-2 text-sm font-normal text-muted-foreground print:text-gray-500 print:text-[10px]">({cls.totalAssessments} penilaian)</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="print:bg-purple-50">
                              <TableHead className="print:text-[10px]">No</TableHead>
                              <TableHead className="print:text-[10px]">Nama</TableHead>
                              <TableHead className="print:text-[10px]">No Induk</TableHead>
                              {cls.assessments.map((a: any) => (
                                <TableHead key={a.id} className="text-center print:text-[10px]">
                                  <div className="text-xs">{a.title}</div>
                                  <div className="text-[10px] text-muted-foreground">{a.componentName}</div>
                                </TableHead>
                              ))}
                              <TableHead className="text-center bg-muted/50 print:bg-purple-100 print:text-[10px]">Rata-rata</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cls.students.map((s: any, i: number) => (
                              <TableRow key={s.studentId} className="print:py-0 print:border-b print:border-gray-100">
                                <TableCell className="print:text-9px print:px-2 print:py-0.5">{i + 1}</TableCell>
                                <TableCell className="font-medium print:text-9px print:px-2 print:py-0.5">{s.studentName}</TableCell>
                                <TableCell className="font-mono print:text-9px print:px-2 print:py-0.5">{s.studentNumber}</TableCell>
                                {cls.assessments.map((a: any) => {
                                  const score = s.scores.find((sc: any) => sc.assessmentId === a.id);
                                  return (
                                    <TableCell key={a.id} className="text-center print:text-[10px]">
                                      {score ? (
                                        <span className={score.score >= a.maxScore * 0.8 ? 'text-green-600 font-medium print:text-green-800' : score.score >= a.maxScore * 0.5 ? '' : 'text-red-600 print:text-red-800'}>
                                          {score.score}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground print:text-gray-400">-</span>
                                      )}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-center bg-muted/50 font-bold print:bg-purple-50 print:text-[10px]">
                                  {s.averageScore}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Print Footer ── */}
      <PrintFooter />
    </div>
  );
}
