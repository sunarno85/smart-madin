import { useQuery } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { PrintHeader, PrintFooter } from '../components/PrintHeader';
import { Download, Users, BookOpen, Calendar, Shield, Printer } from 'lucide-react';

export function LaporanPTKPage() {
  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: () => api.get('/school/profile').then((r) => r.data),
  });

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academicYears'],
    queryFn: () => api.get('/academic-years').then((r) => r.data?.data || r.data || []),
  });
  const activeYear = academicYears.find((y: any) => y.isActive);

  const { data: empStats } = useQuery({
    queryKey: ['employeeStats'],
    queryFn: () => api.get('/reports/employees/stats').then((r) => r.data),
  });

  const generatePDF = () => {
    if (!empStats) return;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text('LAPORAN STATISTIK PTK & TENDIK', pageW / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Tahun Ajaran ${activeYear?.name || '-'}`, pageW / 2, 22, { align: 'center' });

    let y = 32;
    doc.setFontSize(11);
    doc.text('Ringkasan:', 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Total Pegawai: ${empStats.totalEmployees}`, 14, y); y += 6;
    doc.text(`Guru: ${empStats.byType?.TEACHER || 0}`, 14, y); y += 6;
    doc.text(`Tendik: ${empStats.byType?.STAFF || 0}`, 14, y); y += 6;
    doc.text(`Aktif: ${empStats.byStatus?.ACTIVE || 0}`, 14, y); y += 12;

    autoTable(doc, {
      startY: y,
      head: [['No', 'No Induk', 'Nama', 'L/P', 'Tipe', 'Status', 'Mata Pelajaran', 'Jadwal']],
      body: empStats.employees.map((e: any, i: number) => [
        i + 1,
        e.employeeNumber,
        e.fullName,
        e.gender === 'MALE' ? 'L' : 'P',
        e.employeeType === 'TEACHER' ? 'Guru' : 'Tendik',
        e.activityStatus === 'ACTIVE' ? 'Aktif' : e.activityStatus,
        e.subjects.join(', ') || '-',
        e.scheduleCount,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [234, 88, 12] },
    });

    doc.save('laporan-statistik-ptk.pdf');
  };

  return (
    <div className="space-y-6 print:space-y-0">
      {/* ── App Header (hidden on print) ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Laporan PTK & Tendik</h1>
          <p className="text-muted-foreground">Statistik data pegawai dan tenaga pendidik</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Cetak</Button>
          <Button onClick={generatePDF} className="gap-2" disabled={!empStats}>
            <Download className="h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* ── Print Header ── */}
      <PrintHeader
        title="Laporan PTK & Tendik"
        subtitle={`Tahun Ajaran ${activeYear?.name || '-'} — Total: ${empStats?.totalEmployees || 0} Pegawai`}
      />

      {empStats && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 print:grid-cols-4 print:gap-2">
            <Card className="print:border print:border-gray-300 print:shadow-none">
              <CardContent className="p-4 print:p-2">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1 print:text-gray-500 print:text-[10px]"><Users className="h-4 w-4 print:hidden" /> Total</div>
                <p className="text-2xl font-bold print:text-xl">{empStats.totalEmployees}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:border-gray-300 print:shadow-none">
              <CardContent className="p-4 print:p-2">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1 print:text-gray-500 print:text-[10px]"><BookOpen className="h-4 w-4 print:hidden" /> Guru</div>
                <p className="text-2xl font-bold text-blue-600 print:text-xl print:text-blue-800">{empStats.byType?.TEACHER || 0}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:border-gray-300 print:shadow-none">
              <CardContent className="p-4 print:p-2">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1 print:text-gray-500 print:text-[10px]"><Shield className="h-4 w-4 print:hidden" /> Tendik</div>
                <p className="text-2xl font-bold text-orange-600 print:text-xl print:text-orange-800">{empStats.byType?.STAFF || 0}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:border-gray-300 print:shadow-none">
              <CardContent className="p-4 print:p-2">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1 print:text-gray-500 print:text-[10px]"><Calendar className="h-4 w-4 print:hidden" /> Aktif</div>
                <p className="text-2xl font-bold text-green-600 print:text-xl print:text-green-800">{empStats.byStatus?.ACTIVE || 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="print:border print:border-gray-300 print:shadow-none">
            <CardHeader className="print-section-header print:pb-1 print:mb-0">
              <CardTitle className="text-base print:text-sm">Daftar Pegawai ({empStats.employees.length})</CardTitle>
            </CardHeader>
            <CardContent className="print:p-0 print-section-content">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="print:bg-orange-50">
                      <TableHead className="print:text-[10px]">No</TableHead>
                      <TableHead className="print:text-[10px]">No Induk</TableHead>
                      <TableHead className="print:text-[10px]">Nama</TableHead>
                      <TableHead className="print:text-[10px]">L/P</TableHead>
                      <TableHead className="print:text-[10px]">Tipe</TableHead>
                      <TableHead className="print:text-[10px]">Status</TableHead>
                      <TableHead className="print:text-[10px]">Mata Pelajaran</TableHead>
                      <TableHead className="text-center print:text-[10px]">Jadwal</TableHead>
                      <TableHead className="text-center print:text-[10px]">User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empStats.employees.map((e: any, i: number) => (
                      <TableRow key={e.id} className="print:py-0 print:border-b print:border-gray-100">
                        <TableCell className="print:text-9px print:px-2 print:py-0.5">{i + 1}</TableCell>
                        <TableCell className="font-mono print:text-9px print:px-2 print:py-0.5">{e.employeeNumber}</TableCell>
                        <TableCell className="font-medium print:text-9px print:px-2 print:py-0.5">{e.fullName}</TableCell>
                        <TableCell className="print:text-9px print:px-2 print:py-0.5">{e.gender === 'MALE' ? 'L' : 'P'}</TableCell>
                        <TableCell className="print:text-9px print:px-2 print:py-0.5">
                          <Badge variant={e.employeeType === 'TEACHER' ? 'default' : 'secondary'} className="print:bg-orange-50 print:text-orange-800 print:border-orange-200 print:text-[10px]">
                            {e.employeeType === 'TEACHER' ? 'Guru' : 'Tendik'}
                          </Badge>
                        </TableCell>
                        <TableCell className="print:text-9px print:px-2 print:py-0.5">
                          <Badge variant={e.activityStatus === 'ACTIVE' ? 'default' : 'destructive'} className="print:bg-green-50 print:text-green-800 print:border-green-200 print:text-9px">
                            {e.activityStatus === 'ACTIVE' ? 'Aktif' : e.activityStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="print:text-9px print:px-2 print:py-0.5">
                          {e.subjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {e.subjects.map((s: string, j: number) => (
                                <Badge key={j} variant="outline" className="text-xs print:bg-blue-50 print:text-blue-800 print:border-blue-200 print:text-9px">{s}</Badge>
                              ))}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-center print:text-9px print:px-2 print:py-0.5">{e.scheduleCount}</TableCell>
                        <TableCell className="text-center print:text-9px print:px-2 print:py-0.5">
                          {e.hasUser ? <Badge variant="default" className="text-xs print:bg-green-50 print:text-green-800 print:border-green-200 print:text-9px">Ya</Badge> : <span className="text-muted-foreground print:text-gray-400">-</span>}
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

      {/* ── Print Footer ── */}
      <PrintFooter />
    </div>
  );
}
