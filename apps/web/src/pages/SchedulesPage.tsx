import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { PrintHeader, PrintFooter } from '../components/PrintHeader';
import { Plus, Edit, Trash2, Clock, User, BookOpen, Printer } from 'lucide-react';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAY_COLORS = [
  'bg-gray-100 text-gray-800',
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-green-100 text-green-800',
  'bg-yellow-100 text-yellow-800',
  'bg-cyan-100 text-cyan-800',
  'bg-orange-100 text-orange-800',
];

// Print colors for day headers (soft backgrounds, print-bg-keep survives the no-bg rule)
const DAY_PRINT_CLASSES = [
  'print-bg-keep print-bg-minggu', // Minggu
  'print-bg-keep print-bg-senin',   // Senin
  'print-bg-keep print-bg-selasa',  // Selasa
  'print-bg-keep print-bg-rabu',    // Rabu
  'print-bg-keep print-bg-kamis',   // Kamis
  'print-bg-keep print-bg-jumat',   // Jumat
  'print-bg-keep print-bg-sabtu',   // Sabtu
];

// Print colors for level badges
const LEVEL_PRINT_CLASSES: Record<string, string> = {
  TPQ: 'print-bg-keep print-bg-tpq',
  Awaliyah: 'print-bg-keep print-bg-awaliyah',
  Wustha: 'print-bg-keep print-bg-wustha',
  Ulya: 'print-bg-keep print-bg-ulya',
};

const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30',
];

interface Schedule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
  notes?: string;
  class: { id: string; name: string; level: { id: string; name: string } };
  subject: { id: string; name: string; nameArabic?: string };
  teacher: { id: string; fullName: string };
  academicYear: { id: string; name: string };
}

interface ClassItem {
  id: string;
  name: string;
  level: { id: string; name: string };
  academicYearId: string;
}

interface SubjectItem {
  id: string;
  name: string;
  nameArabic?: string;
}

interface TeacherItem {
  id: string;
  fullName: string;
  employeeType: string;
}

interface AcademicYear {
  id: string;
  name: string;
  isActive: boolean;
}

interface Level {
  id: string;
  name: string;
}

const EMPTY_FORM = {
  academicYearId: '', classId: '', subjectId: '', teacherId: '',
  dayOfWeek: 1, startTime: '08:00', endTime: '09:00', room: '', notes: '',
};

export function SchedulesPage() {
  const queryClient = useQueryClient();
  const [classFilter, setClassFilter] = useState<string>('all');
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: () => api.get('/school/profile').then((r) => r.data),
  });

  const { data: academicYears = [] } = useQuery<AcademicYear[]>({
    queryKey: ['academicYears'],
    queryFn: () => api.get('/academic-years').then((r) => r.data?.data || r.data || []),
  });
  const activeYear = academicYears.find((y) => y.isActive);

  const { data: levels = [] } = useQuery<Level[]>({
    queryKey: ['levels'],
    queryFn: () => api.get('/levels').then((r) => r.data?.data || r.data || []),
  });

  const { data: classes = [] } = useQuery<ClassItem[]>({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data?.data || r.data || []),
  });

  // Filter classes by selected level
  const filteredClasses = levelFilter !== 'all'
    ? classes.filter((c) => c.level?.id === levelFilter)
    : classes;

  const { data: subjects = [] } = useQuery<SubjectItem[]>({
    queryKey: ['subjects'],
    queryFn: () => api.get('/subjects').then((r) => r.data?.data || r.data || []),
  });

  const { data: employees = [] } = useQuery<TeacherItem[]>({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees', { params: { employeeType: 'TEACHER' } }).then((r) => r.data?.data || r.data || []),
  });

  const schedulesQuery = useQuery<Schedule[]>({
    queryKey: ['schedules', classFilter, dayFilter, activeYear?.id],
    queryFn: () => {
      const params: any = {};
      if (activeYear?.id) params.academicYearId = activeYear.id;
      if (classFilter !== 'all') params.classId = classFilter;
      if (dayFilter !== 'all') params.dayOfWeek = dayFilter;
      return api.get('/schedules', { params }).then((r) => r.data);
    },
    enabled: !!activeYear,
  });

  const schedules = schedulesQuery.data || [];

  // Apply level filter client-side
  const filteredSchedules = levelFilter !== 'all'
    ? schedules.filter((s) => s.class?.level?.id === levelFilter)
    : schedules;

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/schedules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setDialogOpen(false); setForm(EMPTY_FORM); setError('');
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Gagal menyimpan jadwal'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/schedules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setDialogOpen(false); setEditingSchedule(null); setForm(EMPTY_FORM); setError('');
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Gagal memperbarui jadwal'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setDeleteDialogOpen(false); setDeletingSchedule(null);
    },
  });

  const openCreate = () => {
    setEditingSchedule(null);
    setForm({ ...EMPTY_FORM, academicYearId: activeYear?.id || '' });
    setError(''); setDialogOpen(true);
  };

  const openEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    const start = new Date(schedule.startTime);
    const end = new Date(schedule.endTime);
    setForm({
      academicYearId: schedule.academicYear.id,
      classId: schedule.class.id,
      subjectId: schedule.subject.id,
      teacherId: schedule.teacher.id,
      dayOfWeek: schedule.dayOfWeek,
      startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
      endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
      room: schedule.room || '', notes: schedule.notes || '',
    });
    setError(''); setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.classId || !form.subjectId || !form.teacherId || !form.academicYearId) {
      setError('Lengkapi semua field yang wajib diisi'); return;
    }
    const now = new Date().toISOString().split('T')[0];
    const payload = { ...form, startTime: `${now}T${form.startTime}:00`, endTime: `${now}T${form.endTime}:00` };
    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const schedulesByDay = DAYS.map((day, i) => ({
    day, index: i,
    schedules: filteredSchedules.filter((s) => s.dayOfWeek === i).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
  }));

  const totalEntries = filteredSchedules.length;
  const uniqueTeachers = new Set(filteredSchedules.map((s) => s.teacher.id)).size;
  const uniqueClasses = new Set(filteredSchedules.map((s) => s.class.id)).size;

  // Build class options from filtered classes for the form
  const classOptions = levelFilter !== 'all' ? filteredClasses : classes;

  return (
    <div className="space-y-6 print:space-y-0">
      {/* ── App Header (hidden on print) ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Jadwal Pelajaran</h1>
          <p className="text-muted-foreground">Kelola jadwal pelajaran mingguan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Cetak</Button>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Tambah Jadwal</Button>
        </div>
      </div>

      {/* ── Print Header ── */}
      <PrintHeader
        title="Jadwal Pelajaran Mingguan"
        subtitle={`Tahun Ajaran ${activeYear?.name || '-'}${levelFilter !== 'all' ? ` — Jenjang: ${levels.find((l) => l.id === levelFilter)?.name}` : ''}${classFilter !== 'all' ? ` — Kelas: ${classes.find((c) => c.id === classFilter)?.name}` : ' — Semua Kelas'}`}
      />

      {/* ── Stats (hidden on print) ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 print:hidden">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Jadwal</p>
            <p className="text-2xl font-bold">{totalEntries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Kelas Terjadwal</p>
            <p className="text-2xl font-bold">{uniqueClasses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Guru Aktif</p>
            <p className="text-2xl font-bold">{uniqueTeachers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tahun Ajaran</p>
            <p className="text-lg font-bold">{activeYear?.name || '-'}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters (hidden on print) ── */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Select value={levelFilter} onValueChange={(v) => { setLevelFilter(v); setClassFilter('all'); }}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Semua Jenjang" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenjang</SelectItem>
                {levels.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {filteredClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Semua Hari" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Hari</SelectItem>
                {DAYS.map((day, i) => <SelectItem key={i} value={String(i)}>{day}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Weekly Timetable ── */}
      <div className="space-y-4">
        {schedulesByDay.map(({ day, index, schedules: daySchedules }) => {
          const visible = dayFilter === 'all' || parseInt(dayFilter) === index;
          if (!visible) return null;
          return (
            <Card key={index} className="print:shadow-none" style={{ printColorAdjust: 'exact' }}>
              <div className={`print-section-header flex items-center gap-2 px-4 py-2 ${DAY_COLORS[index]} rounded-t-lg print:rounded-none print:border print:border-b-2 ${DAY_PRINT_CLASSES[index]}`}>
                <span className="font-semibold text-sm">{day}</span>
                <Badge variant="secondary" className="text-xs print:text-gray-800">{daySchedules.length} jadwal</Badge>
              </div>
              <CardContent className="p-0 print:p-0">
                {daySchedules.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground print:text-gray-400">Tidak ada jadwal</p>
                ) : (
                  <div className="divide-y print:divide-gray-200">
                    {daySchedules.map((s) => (
                      <div key={s.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors print:hover:bg-transparent print:py-2">
                        <div className="flex items-center gap-1 text-sm font-mono text-muted-foreground w-28 shrink-0 print:text-gray-600 print:text-xs">
                          <Clock className="h-3.5 w-3.5 print:hidden" />
                          <span>{formatTime(s.startTime)} - {formatTime(s.endTime)}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <BookOpen className="h-4 w-4 text-blue-500 shrink-0 print:hidden" />
                          <div className="min-w-0">
                            <p className="font-medium truncate text-sm print:text-xs">{s.subject.name}</p>
                            {s.subject.nameArabic && (
                              <p className="text-xs text-muted-foreground print:text-gray-500">{s.subject.nameArabic}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={`shrink-0 hidden sm:inline-flex print:inline-flex print:text-[10px] print:border ${LEVEL_PRINT_CLASSES[s.class.level?.name] || ''}`}>{s.class.name}</Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0 hidden md:flex print:flex print:text-gray-600 print:text-[10px]">
                          <User className="h-3.5 w-3.5 print:hidden" />
                          <span>{s.teacher.fullName}</span>
                        </div>
                        {s.room && (
                          <Badge variant="secondary" className="shrink-0 hidden lg:inline-flex print:inline-flex print:border-green-200 print:text-green-800 print:text-[10px]">{s.room}</Badge>
                        )}
                        <div className="flex gap-1 shrink-0 print:hidden">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeletingSchedule(s); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Print Footer ── */}
      <PrintFooter />

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kelas *</Label>
                <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                  <SelectContent>
                    {classOptions.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name} ({cls.level?.name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mata Pelajaran *</Label>
                <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih mapel" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Guru *</Label>
              <Select value={form.teacherId} onValueChange={(v) => setForm({ ...form, teacherId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih guru" /></SelectTrigger>
                <SelectContent>
                  {employees.map((t) => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hari *</Label>
              <Select value={String(form.dayOfWeek)} onValueChange={(v) => setForm({ ...form, dayOfWeek: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, i) => <SelectItem key={i} value={String(i)}>{day}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jam Mulai *</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}>
                  {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Jam Selesai *</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}>
                  {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ruangan</Label>
              <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Contoh: R. Al-Hikmah" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Jadwal</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus <strong>{deletingSchedule?.subject?.name}</strong> di kelas <strong>{deletingSchedule?.class?.name}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={() => deletingSchedule && deleteMutation.mutate(deletingSchedule.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
