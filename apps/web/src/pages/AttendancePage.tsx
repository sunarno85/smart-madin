import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Plus, CheckCircle2, XCircle, AlertCircle, MinusCircle, Calendar,
  QrCode, Clock, Users, Search, RefreshCw, Printer, X, ChevronDown, ChevronUp,
} from 'lucide-react';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PRESENT: <CheckCircle2 size={18} className="text-green-600" />,
  SICK: <AlertCircle size={18} className="text-yellow-600" />,
  PERMISSION: <MinusCircle size={18} className="text-blue-600" />,
  ABSENT: <XCircle size={18} className="text-red-600" />,
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Hadir',
  SICK: 'Sakit',
  PERMISSION: 'Izin',
  ABSENT: 'Alpa',
};

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-green-100 text-green-800 border-green-200',
  SICK: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  PERMISSION: 'bg-blue-100 text-blue-800 border-blue-200',
  ABSENT: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_BG: Record<string, string> = {
  PRESENT: 'bg-green-50 border-green-200 hover:bg-green-100',
  SICK: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
  PERMISSION: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  ABSENT: 'bg-red-50 border-red-200 hover:bg-red-100',
};

export function AttendancePage() {
  const queryClient = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [form, setForm] = useState({
    classId: '', academicYearId: '', date: new Date().toISOString().split('T')[0],
    teacherId: '', subjectId: '', notes: '',
    semester: 'SATU' as 'SATU' | 'DUA',
  });
  const [listSemester, setListSemester] = useState<'all' | 'SATU' | 'DUA'>('all');

  // ── Queries ──
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data?.data || r.data || []),
  });

  const { data: years = [] } = useQuery({
    queryKey: ['academicYears'],
    queryFn: () => api.get('/academic-years').then((r) => r.data?.data || r.data || []),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/subjects').then((r) => r.data?.data || r.data || []),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => api.get('/employees', { params: { employeeType: 'TEACHER', pageSize: 100 } }).then((r) => r.data?.data || []),
  });
  const employees = employeesData || [];

  const { data: sessionsResponse, isLoading: sessionsLoading } = useQuery({
    queryKey: ['attendance-sessions', listSemester],
    queryFn: () =>
      api
        .get('/attendance/sessions', {
          params: { pageSize: 50, ...(listSemester !== 'all' ? { semester: listSemester } : {}) },
        })
        .then((r) => r.data),
  });
  const sessions = sessionsResponse?.data || [];

  // Auto-refresh session detail every 5 seconds when active
  const { data: sessionDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['attendance-session', activeSession],
    queryFn: () => api.get(`/attendance/sessions/${activeSession}`).then((r) => r.data),
    enabled: !!activeSession,
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery({
    queryKey: ['attendance-stats'],
    queryFn: () => api.get('/attendance/stats').then((r) => r.data),
  });

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/attendance/sessions', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
      setOpenCreate(false);
      setForm({ classId: '', academicYearId: '', date: new Date().toISOString().split('T')[0], teacherId: '', subjectId: '', notes: '', semester: 'SATU' });
      setActiveSession(res.data?.id || null);
      toast.success('Sesi presensi berhasil dibuat');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal membuat sesi'),
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ sessionId, studentId, status }: any) =>
      api.patch(`/attendance/sessions/${sessionId}/records/${studentId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-session'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ sessionId, records }: any) =>
      api.post(`/attendance/sessions/${sessionId}/records/bulk`, { records }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-session'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
      toast.success('Kehadiran berhasil diperbarui');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/attendance/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
      if (activeSession) setActiveSession(null);
      toast.success('Sesi presensi berhasil dihapus');
    },
  });

  // ── Handlers ──
  const handleMarkAllPresent = () => {
    if (!sessionDetail) return;
    bulkUpdateMutation.mutate({
      sessionId: sessionDetail.id,
      records: sessionDetail.records.map((r: any) => ({ studentId: r.studentId, status: 'PRESENT' })),
    });
  };

  const handleMarkAllAbsent = () => {
    if (!sessionDetail) return;
    bulkUpdateMutation.mutate({
      sessionId: sessionDetail.id,
      records: sessionDetail.records.map((r: any) => ({ studentId: r.studentId, status: 'ABSENT' })),
    });
  };

  const handleSearchMarkPresent = () => {
    if (!sessionDetail || !searchQuery.trim()) return;
    const matching = sessionDetail.records?.filter((r: any) =>
      r.student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.student.studentNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (matching?.length > 0) {
      bulkUpdateMutation.mutate({
        sessionId: sessionDetail.id,
        records: matching.map((r: any) => ({ studentId: r.studentId, status: 'PRESENT' })),
      });
      setSearchQuery('');
      toast.success(`${matching.length} santri ditandai hadir`);
    }
  };

  // ── Computed ──
  const sessionStats = sessionDetail?.records?.reduce(
    (acc: any, r: any) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; },
    { PRESENT: 0, SICK: 0, PERMISSION: 0, ABSENT: 0 },
  ) || { PRESENT: 0, SICK: 0, PERMISSION: 0, ABSENT: 0 };

  const totalStudents = sessionDetail?.records?.length || 0;
  const presentRate = totalStudents > 0 ? Math.round((sessionStats.PRESENT / totalStudents) * 100) : 0;

  const filteredRecords = sessionDetail?.records?.filter((r: any) =>
    !searchQuery || r.student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.student.studentNumber.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const sortedSessions = [...sessions].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activeYear = years.find((y: any) => y.isActive);
  const formClasses = classes;

  // Default the create form semester to the active year's semester
  useEffect(() => {
    if (openCreate) {
      setForm((prev) => ({ ...prev, semester: (activeYear?.activeSemester as 'SATU' | 'DUA') ?? 'SATU' }));
    }
  }, [openCreate]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Presensi</h1>
          <p className="text-muted-foreground">Manajemen kehadiran santri secara real-time</p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Buat Sesi Presensi</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Buat Sesi Presensi Baru</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, academicYearId: form.academicYearId || activeYear?.id }); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kelas *</Label>
                  <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                    <SelectContent>
                      {formClasses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mata Pelajaran *</Label>
                  <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Guru *</Label>
                <Select value={form.teacherId} onValueChange={(v) => setForm({ ...form, teacherId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={form.semester} onValueChange={(v: 'SATU' | 'DUA') => setForm({ ...form, semester: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SATU">Semester 1 (Ganjil)</SelectItem>
                    <SelectItem value="DUA">Semester 2 (Genap)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Membuat...' : 'Buat Sesi'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Stats Cards ── */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5 print:hidden">
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Sesi</p>
            <p className="text-2xl font-bold">{stats.totalSessions}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Rate Kehadiran</p>
            <p className="text-2xl font-bold text-green-600">{stats.attendanceRate}%</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Hadir</p>
            <p className="text-2xl font-bold text-green-600">{stats.presentCount}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Sakit + Izin</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.sickCount + stats.permissionCount}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Alpa</p>
            <p className="text-2xl font-bold text-red-600">{stats.absentCount}</p>
          </CardContent></Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Session List ── */}
        <div className="lg:col-span-1 space-y-2 print:hidden">
          <div className="flex items-center justify-between mb-2 gap-2">
            <h3 className="font-semibold text-sm">Daftar Sesi Presensi</h3>
            <Select value={listSemester} onValueChange={(v: any) => setListSemester(v)}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Semester</SelectItem>
                <SelectItem value="SATU">Semester 1</SelectItem>
                <SelectItem value="DUA">Semester 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {sessionsLoading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)
          ) : sortedSessions.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">
              Belum ada sesi presensi
            </CardContent></Card>
          ) : (
            sortedSessions.map((s: any) => {
              const isActive = activeSession === s.id;
              const sessionRate = s._count?.records ? Math.round((s.presentCount || 0) / s._count.records * 100) : null;
              return (
                <Card
                  key={s.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${isActive ? 'ring-2 ring-primary shadow-md' : ''}`}
                  onClick={() => { setActiveSession(s.id); setShowQR(false); }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={isActive ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                            {s.class?.level?.name || 'Kelas'}
                          </Badge>
                          <p className="font-medium text-sm truncate">{s.class?.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{s.subject?.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[11px] text-muted-foreground">{s.teacher?.fullName}</p>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs text-muted-foreground">{s._count?.records || 0} siswa</p>
                        {isActive && <div className="mt-1"><Badge variant="default" className="text-[10px]">Aktif</Badge></div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* ── Session Detail / Empty State ── */}
        <div className="lg:col-span-2">
          {activeSession && sessionDetail ? (
            <div className="space-y-4">
              {/* Session Header */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-lg">
                        {sessionDetail.class?.name} — {sessionDetail.subject?.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(sessionDetail.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        {' • '}{sessionDetail.teacher?.fullName}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowQR(!showQR)} className="gap-1">
                        {showQR ? <X size={14} /> : <QrCode size={14} />}
                        {showQR ? 'Tutup QR' : 'QR Code'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleMarkAllPresent} disabled={bulkUpdateMutation.isPending}>
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Semua Hadir
                      </Button>
                      <Button size="sm" variant="destructive" onClick={handleMarkAllAbsent} disabled={bulkUpdateMutation.isPending}>
                        <XCircle className="mr-1 h-4 w-4" /> Semua Alpa
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Kehadiran: {sessionStats.PRESENT}/{totalStudents} ({presentRate}%)</span>
                      <div className="flex items-center gap-3">
                        <span className="text-green-600">✓ {sessionStats.PRESENT}</span>
                        <span className="text-yellow-600">⚠ {sessionStats.SICK}</span>
                        <span className="text-blue-600">• {sessionStats.PERMISSION}</span>
                        <span className="text-red-600">✗ {sessionStats.ABSENT}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="flex h-full">
                        <div className="bg-green-500 transition-all duration-500" style={{ width: `${totalStudents > 0 ? (sessionStats.PRESENT / totalStudents) * 100 : 0}%` }} />
                        <div className="bg-yellow-500 transition-all duration-500" style={{ width: `${totalStudents > 0 ? (sessionStats.SICK / totalStudents) * 100 : 0}%` }} />
                        <div className="bg-blue-500 transition-all duration-500" style={{ width: `${totalStudents > 0 ? (sessionStats.PERMISSION / totalStudents) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Quick Status Badges */}
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(sessionStats).map(([status, count]) => (
                      <Badge key={status} variant="secondary" className={`${STATUS_COLORS[status]} gap-1`}>
                        {STATUS_ICONS[status]} {STATUS_LABELS[status]}: {String(count)}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
              </Card>

              {/* QR Code Panel */}
              {showQR && (
                <Card className="border-2 border-dashed border-primary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <QrCode className="h-5 w-5" /> QR Code Presensi
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Tampilkan QR Code ini untuk check-in mandiri santri
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center py-6">
                    <div className="bg-white p-4 rounded-xl shadow-lg border print:shadow-none">
                      <QRCodeSVG
                        value={`${window.location.origin}/checkin/${sessionDetail.id}`}
                        size={200}
                        level="M"
                        includeMargin={true}
                      />
                    </div>
                    <p className="mt-3 text-sm font-medium">{sessionDetail.class?.name} — {sessionDetail.subject?.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(sessionDetail.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1">
                        <Printer size={14} /> Cetak QR
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Search + View Toggle */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari nama atau no induk santri..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {searchQuery && (
                      <Button size="sm" variant="outline" onClick={handleSearchMarkPresent} disabled={bulkUpdateMutation.isPending}>
                        <CheckCircle2 size={14} className="mr-1" /> Tandai Hadir
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      onClick={() => setViewMode('grid')}
                    >
                      Grid
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      onClick={() => setViewMode('table')}
                    >
                      Tabel
                    </Button>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <RefreshCw size={12} className={detailLoading ? 'animate-spin' : ''} />
                      <span>Auto</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Student Grid View */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredRecords.map((rec: any) => (
                    <div
                      key={rec.id}
                      className={`rounded-lg border-2 p-3 cursor-pointer transition-all duration-200 ${STATUS_BG[rec.status]} ${
                        rec.status === 'PRESENT' ? 'ring-1 ring-green-300' :
                        rec.status === 'SICK' ? 'ring-1 ring-yellow-300' :
                        rec.status === 'PERMISSION' ? 'ring-1 ring-blue-300' :
                        'ring-1 ring-red-200'
                      }`}
                      onClick={() => updateRecordMutation.mutate({
                        sessionId: sessionDetail.id,
                        studentId: rec.studentId,
                        status: 'PRESENT',
                      })}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-xs font-bold text-primary">
                          {rec.student.fullName.charAt(0)}
                        </div>
                        {rec.status === 'PRESENT' && <CheckCircle2 size={16} className="text-green-600" />}
                        {rec.status === 'SICK' && <AlertCircle size={16} className="text-yellow-600" />}
                        {rec.status === 'PERMISSION' && <MinusCircle size={16} className="text-blue-600" />}
                        {rec.status === 'ABSENT' && <XCircle size={16} className="text-red-500" />}
                      </div>
                      <p className="font-medium text-sm truncate">{rec.student.fullName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{rec.student.studentNumber}</p>
                      <div className="flex gap-1 mt-2">
                        {(['PRESENT', 'SICK', 'PERMISSION', 'ABSENT'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateRecordMutation.mutate({
                                sessionId: sessionDetail.id,
                                studentId: rec.studentId,
                                status,
                              });
                            }}
                            className={`flex-1 rounded py-1 text-[10px] font-medium transition-colors ${
                              rec.status === status
                                ? `${STATUS_COLORS[status]} border`
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100 border border-transparent'
                            }`}
                          >
                            {STATUS_LABELS[status]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Table View */
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">No</TableHead>
                          <TableHead>No Induk</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>L/P</TableHead>
                          <TableHead className="text-center">Kehadiran</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((rec: any, i: number) => (
                          <TableRow key={rec.id}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="font-mono text-xs">{rec.student.studentNumber}</TableCell>
                            <TableCell className="font-medium">{rec.student.fullName}</TableCell>
                            <TableCell>{rec.student.gender === 'MALE' ? 'L' : 'P'}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                {(['PRESENT', 'SICK', 'PERMISSION', 'ABSENT'] as const).map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => updateRecordMutation.mutate({
                                      sessionId: sessionDetail.id,
                                      studentId: rec.studentId,
                                      status,
                                    })}
                                    className={`rounded-lg p-2 transition-colors ${
                                      rec.status === status
                                        ? `${STATUS_COLORS[status]} ring-2 ring-offset-1 ring-current/20`
                                        : 'hover:bg-muted text-muted-foreground'
                                    }`}
                                    title={STATUS_LABELS[status]}
                                  >
                                    {STATUS_ICONS[status]}
                                  </button>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Calendar size={48} className="text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-medium">Pilih sesi presensi dari daftar di sebelah kiri</p>
                <p className="text-sm text-muted-foreground mt-1">atau buat sesi baru untuk memulai presensi</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
