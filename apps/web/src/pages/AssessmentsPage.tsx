import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  Plus, Save, BarChart3, Users, BookOpen, Award, FileText, Trash2, Edit,
  CheckCircle2, Calculator, GraduationCap, ClipboardCheck, TrendingUp,
} from 'lucide-react';
import { Can, useCan } from '../components/Can';

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-100 text-green-800',
  B: 'bg-blue-100 text-blue-800',
  C: 'bg-yellow-100 text-yellow-800',
  D: 'bg-orange-100 text-orange-800',
  E: 'bg-red-100 text-red-800',
};

export function AssessmentsPage() {
  const queryClient = useQueryClient();
  const canCreate = useCan('assessments.create');
  const canUpdate = useCan('assessments.update');
  const [activeTab, setActiveTab] = useState('list');

  // ── Create Assessment ──
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [form, setForm] = useState({
    classId: '', academicYearId: '', subjectId: '', componentId: '',
    title: '', description: '', maxScore: '100', date: new Date().toISOString().split('T')[0],
    semester: 'SATU' as 'SATU' | 'DUA',
  });
  const [listSemester, setListSemester] = useState<'all' | 'SATU' | 'DUA'>('all');

  // ── Batch Scoring ──
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);
  const [batchScores, setBatchScores] = useState<Record<string, string>>({});

  // ── Recap ──
  const [recapClassId, setRecapClassId] = useState('');
  const [recapSubjectId, setRecapSubjectId] = useState('');
  const [recapSemester, setRecapSemester] = useState<'all' | 'SATU' | 'DUA'>('all');

  // ── GPA ──
  const [gpaClassId, setGpaClassId] = useState('');
  const [gpaSemester, setGpaSemester] = useState<'all' | 'SATU' | 'DUA'>('all');

  // ── Rubric Template ──
  const [rubricDialogOpen, setRubricDialogOpen] = useState(false);
  const [rubricForm, setRubricForm] = useState({
    name: '', description: '', maxScore: '100',
  });
  const [rubricCriteria, setRubricCriteria] = useState<{
    name: string; description: string; weight: string; maxScore: string;
    levels: { label: string; minScore: string; maxScore: string; description: string }[];
  }[]>([]);

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
  const { data: components = [] } = useQuery({
    queryKey: ['assessmentComponents'],
    queryFn: () => api.get('/assessments/components').then((r) => r.data || []),
  });
  const activeYear = years.find((y: any) => y.isActive);

  // Default the create form semester to the active year's semester
  useEffect(() => {
    if (createDialogOpen) {
      setForm((prev) => ({ ...prev, semester: (activeYear?.activeSemester as 'SATU' | 'DUA') ?? 'SATU' }));
    }
  }, [createDialogOpen]);

  const { data: assessments = [] } = useQuery({
    queryKey: ['assessments', listSemester],
    queryFn: () =>
      api
        .get('/assessments', { params: listSemester !== 'all' ? { semester: listSemester } : {} })
        .then((r) => r.data || []),
  });

  const { data: assessmentDetail } = useQuery({
    queryKey: ['assessment-detail', selectedAssessment],
    queryFn: () => api.get(`/assessments/${selectedAssessment}`).then((r) => r.data),
    enabled: !!selectedAssessment,
  });

  const { data: recapData } = useQuery({
    queryKey: ['grade-recap', recapClassId, activeYear?.id, recapSubjectId, recapSemester],
    queryFn: () => {
      const params = new URLSearchParams();
      if (recapSubjectId && recapSubjectId !== 'all') params.set('subjectId', recapSubjectId);
      if (recapSemester !== 'all') params.set('semester', recapSemester);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return api.get(`/assessments/recap/${recapClassId}/${activeYear?.id}${qs}`).then((r) => r.data);
    },
    enabled: !!recapClassId && !!activeYear,
  });

  const { data: gpaData } = useQuery({
    queryKey: ['gpa-data', gpaClassId, activeYear?.id, gpaSemester],
    queryFn: () =>
      api
        .get(`/assessments/gpa/${gpaClassId}/${activeYear?.id}`, {
          params: gpaSemester !== 'all' ? { semester: gpaSemester } : {},
        })
        .then((r) => r.data),
    enabled: !!gpaClassId && !!activeYear,
  });

  const { data: rubrics = [] } = useQuery({
    queryKey: ['rubric-templates'],
    queryFn: () => api.get('/assessments/rubrics').then((r) => r.data || []),
  });

  const { data: stats } = useQuery({
    queryKey: ['assessment-stats'],
    queryFn: () => api.get('/assessments/stats').then((r) => r.data),
  });

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/assessments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      setCreateDialogOpen(false);
      setForm({ classId: '', academicYearId: '', subjectId: '', componentId: '', title: '', description: '', maxScore: '100', date: new Date().toISOString().split('T')[0], semester: 'SATU' });
      toast.success('Penilaian berhasil dibuat');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal membuat penilaian'),
  });

  const bulkScoreMutation = useMutation({
    mutationFn: ({ assessmentId, scores }: any) => api.post(`/assessments/${assessmentId}/scores/bulk`, { scores }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['assessment-detail'] });
      toast.success('Nilai berhasil disimpan');
    },
  });

  const createRubricMutation = useMutation({
    mutationFn: (data: any) => api.post('/assessments/rubrics', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubric-templates'] });
      setRubricDialogOpen(false);
      toast.success('Template rubrik berhasil dibuat');
    },
  });

  const deleteRubricMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/assessments/rubrics/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubric-templates'] });
      toast.success('Template rubrik berhasil dihapus');
    },
  });

  // ── Handlers ──
  const handleCreate = () => {
    if (!form.classId || !form.componentId || !form.subjectId || !form.title) {
      toast.error('Lengkapi semua field yang wajib diisi'); return;
    }
    createMutation.mutate({
      ...form,
      academicYearId: form.academicYearId || activeYear?.id,
      maxScore: parseFloat(form.maxScore),
    });  };

  const handleSelectAssessment = (id: string) => {
    setSelectedAssessment(id);
    setBatchScores({});
  };

  const handleBatchScore = () => {
    if (!assessmentDetail || !selectedAssessment) return;
    const scores = assessmentDetail.scores
      ?.filter((r: any) => batchScores[r.studentId] !== undefined && batchScores[r.studentId] !== '')
      .map((r: any) => ({
        studentId: r.studentId,
        score: parseFloat(batchScores[r.studentId]),
      }));
    if (!scores || scores.length === 0) {
      toast.error('Tidak ada nilai yang diubah'); return;
    }
    bulkScoreMutation.mutate({ assessmentId: selectedAssessment, scores });
  };

  const addRubricCriterion = () => {
    setRubricCriteria([...rubricCriteria, {
      name: '', description: '', weight: '1', maxScore: '100',
      levels: [
        { label: 'Sangat Baik', minScore: '80', maxScore: '100', description: '' },
        { label: 'Baik', minScore: '60', maxScore: '79', description: '' },
        { label: 'Cukup', minScore: '40', maxScore: '59', description: '' },
        { label: 'Kurang', minScore: '0', maxScore: '39', description: '' },
      ],
    }]);
  };

  const handleCreateRubric = () => {
    if (!rubricForm.name) { toast.error('Nama template wajib diisi'); return; }
    createRubricMutation.mutate({
      ...rubricForm,
      maxScore: parseFloat(rubricForm.maxScore),
      criteria: rubricCriteria.map((c) => ({
        name: c.name,
        description: c.description,
        weight: parseFloat(c.weight),
        maxScore: parseFloat(c.maxScore),
        levels: c.levels.map((l) => ({
          label: l.label,
          minScore: parseFloat(l.minScore),
          maxScore: parseFloat(l.maxScore),
          description: l.description,
        })),
      })),
    });
  };

  const uniqueClassesMap = new Map<string, { id: string; name: string; level: any }>();
  for (const a of assessments as any[]) {
    if (a.class?.id && !uniqueClassesMap.has(a.class.id)) {
      uniqueClassesMap.set(a.class.id, { id: a.class.id, name: a.class.name, level: a.class.level });
    }
  }
  const uniqueClasses = Array.from(uniqueClassesMap.values());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Penilaian & Rubrik</h1>
          <p className="text-muted-foreground">Manajemen penilaian, rubrik, dan rekap nilai</p>
        </div>
        <Can permission="assessments.create">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRubricDialogOpen(true)} className="gap-2">
              <ClipboardCheck className="h-4 w-4" /> Template Rubrik
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Tambah Penilaian
            </Button>
          </div>
        </Can>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Penilaian</p>
            <p className="text-2xl font-bold">{stats.totalAssessments}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Nilai</p>
            <p className="text-2xl font-bold">{stats.totalScores}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Rata-rata</p>
            <p className="text-2xl font-bold text-blue-600">{stats.averageScore}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Tertinggi / Terendah</p>
            <p className="text-2xl font-bold">{stats.maxScore} / {stats.minScore}</p>
          </CardContent></Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${canUpdate ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="list" className="gap-2"><FileText className="h-4 w-4" /> Daftar</TabsTrigger>
          {canUpdate && (
            <TabsTrigger value="scoring" className="gap-2"><CheckCircle2 className="h-4 w-4" /> Input Nilai</TabsTrigger>
          )}
          <TabsTrigger value="recap" className="gap-2"><BarChart3 className="h-4 w-4" /> Rekap</TabsTrigger>
          <TabsTrigger value="gpa" className="gap-2"><GraduationCap className="h-4 w-4" /> GPA</TabsTrigger>
        </TabsList>

        {/* ── Tab: Daftar Penilaian ── */}
        <TabsContent value="list" className="space-y-4">
          <div className="flex justify-end print:hidden">
            <Select value={listSemester} onValueChange={(v: any) => setListSemester(v)}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Semester</SelectItem>
                <SelectItem value="SATU">Semester 1</SelectItem>
                <SelectItem value="DUA">Semester 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Komponen</TableHead>
                    <TableHead className="text-center">Semester</TableHead>
                    <TableHead className="text-center">Max</TableHead>
                    <TableHead className="text-center">Skor</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        Belum ada penilaian
                      </TableCell>
                    </TableRow>
                  ) : (
                    assessments.map((a: any, i: number) => (
                      <TableRow key={a.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{a.title}</TableCell>
                        <TableCell>{a.class?.name}</TableCell>
                        <TableCell>{a.subject?.name}</TableCell>
                        <TableCell><Badge variant="secondary">{a.component?.name}</Badge></TableCell>
                        <TableCell className="text-center"><Badge variant="outline">{a.semester === 'DUA' ? 'Sem 2' : 'Sem 1'}</Badge></TableCell>
                        <TableCell className="text-center">{a.maxScore}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={a._count?.scores > 0 ? 'default' : 'outline'}>
                            {a._count?.scores || 0} siswa
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Can permission="assessments.update">
                            <Button size="sm" variant="ghost" onClick={() => { handleSelectAssessment(a.id); setActiveTab('scoring'); }}>
                              <CheckCircle2 size={14} className="mr-1" /> Input
                            </Button>
                          </Can>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Batch Scoring ── */}
        <TabsContent value="scoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Input Nilai Massal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4">
                <Select value={selectedAssessment || ''} onValueChange={handleSelectAssessment}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih Penilaian" /></SelectTrigger>
                  <SelectContent>
                    {assessments.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.title} — {a.class?.name} ({a.subject?.name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {assessmentDetail && (
                <>
                  <div className="flex items-center gap-3 mb-4 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{assessmentDetail.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {assessmentDetail.class?.name} • {assessmentDetail.subject?.name} • Max: {assessmentDetail.maxScore}
                      </p>
                    </div>
                    <Can permission="assessments.update">
                      <Button onClick={handleBatchScore} disabled={bulkScoreMutation.isPending} className="gap-2">
                        <Save className="h-4 w-4" /> {bulkScoreMutation.isPending ? 'Menyimpan...' : 'Simpan Semua'}
                      </Button>
                    </Can>
                  </div>

                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">No</TableHead>
                          <TableHead>No Induk</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>L/P</TableHead>
                          <TableHead className="text-center">Nilai Saat Ini</TableHead>
                          <TableHead className="text-center w-32">Input Nilai</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assessmentDetail.scores?.map((rec: any, i: number) => (
                          <TableRow key={rec.studentId}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="font-mono text-xs">{rec.student?.studentNumber}</TableCell>
                            <TableCell className="font-medium">{rec.student?.fullName}</TableCell>
                            <TableCell>{rec.student?.gender === 'MALE' ? 'L' : 'P'}</TableCell>
                            <TableCell className="text-center">
                              {rec.score !== null ? (
                                <Badge variant={rec.score >= assessmentDetail.maxScore * 0.8 ? 'default' : rec.score >= assessmentDetail.maxScore * 0.5 ? 'secondary' : 'destructive'}>
                                  {rec.score}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                disabled={!canUpdate}
                                min={0}
                                max={assessmentDetail.maxScore}
                                placeholder={rec.score !== null ? String(rec.score) : '—'}
                                value={batchScores[rec.studentId] || ''}
                                onChange={(e) => setBatchScores({ ...batchScores, [rec.studentId]: e.target.value })}
                                className="w-24 text-center mx-auto"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {!selectedAssessment && (
                <div className="text-center py-12 text-muted-foreground">
                  <Calculator size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Pilih penilaian untuk mulai input nilai massal</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Rekap Nilai ── */}
        <TabsContent value="recap" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Select value={recapClassId} onValueChange={setRecapClassId}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                  <SelectContent>
                    {uniqueClasses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={recapSubjectId} onValueChange={setRecapSubjectId}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Semua Mapel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Mapel</SelectItem>
                    {subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={recapSemester} onValueChange={(v: any) => setRecapSemester(v)}>
                  <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Semester</SelectItem>
                    <SelectItem value="SATU">Semester 1</SelectItem>
                    <SelectItem value="DUA">Semester 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {recapData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rekap Nilai — {recapData.students?.length || 0} Santri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">No</TableHead>
                        <TableHead>Nama</TableHead>
                        {recapData.assessments?.map((a: any) => (
                          <TableHead key={a.id} className="text-center">
                            <div className="text-xs">{a.title}</div>
                            <div className="text-[10px] text-muted-foreground">{a.subject}</div>
                          </TableHead>
                        ))}
                        <TableHead className="text-center bg-muted/50">Rata-rata</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recapData.students?.map((s: any, i: number) => (
                        <TableRow key={s.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-medium">{s.fullName}</TableCell>
                          {s.scores?.map((sc: any) => (
                            <TableCell key={sc.assessmentId} className="text-center">
                              {sc.score !== null ? (
                                <span className={sc.score >= sc.maxScore * 0.8 ? 'text-green-600 font-medium' : sc.score >= sc.maxScore * 0.5 ? '' : 'text-red-600'}>
                                  {sc.score}
                                </span>
                              ) : '—'}
                            </TableCell>
                          ))}
                          <TableCell className="text-center bg-muted/50 font-bold">
                            {s.averageScore ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: GPA Calculator ── */}
        <TabsContent value="gpa" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Select value={gpaClassId} onValueChange={setGpaClassId}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                  <SelectContent>
                    {uniqueClasses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={gpaSemester} onValueChange={(v: any) => setGpaSemester(v)}>
                  <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Semester</SelectItem>
                    <SelectItem value="SATU">Semester 1</SelectItem>
                    <SelectItem value="DUA">Semester 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {gpaData && (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Card><CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Rata-rata Kelas</p>
                  <p className="text-2xl font-bold text-blue-600">{gpaData.classAverage}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Tertinggi</p>
                  <p className="text-2xl font-bold text-green-600">{gpaData.highestGpa}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Terendah</p>
                  <p className="text-2xl font-bold text-red-600">{gpaData.lowestGpa}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Terkorek</p>
                  <p className="text-2xl font-bold">{gpaData.gradedStudents}/{gpaData.totalStudents}</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Perankingan GPA — {gpaData.students?.length} Santri</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Rank</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead className="text-center">No Induk</TableHead>
                          <TableHead className="text-center">Nilai Masuk</TableHead>
                          <TableHead className="text-center">Rata-rata</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gpaData.students?.map((s: any, i: number) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-bold">{i + 1}</TableCell>
                            <TableCell className="font-medium">{s.fullName}</TableCell>
                            <TableCell className="text-center font-mono text-xs">{s.studentNumber}</TableCell>
                            <TableCell className="text-center">{s.totalScored}/{s.totalAssessments}</TableCell>
                            <TableCell className="text-center font-bold">{s.gpa ?? '—'}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={GRADE_COLORS[s.letterGrade] || ''}>{s.letterGrade}</Badge>
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
      </Tabs>

      {/* ── Create Assessment Dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Penilaian Baru</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kelas *</Label>
                <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                  <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mata Pelajaran *</Label>
                <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                  <SelectContent>{subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Komponen *</Label>
                <Select value={form.componentId} onValueChange={(v) => setForm({ ...form, componentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih Komponen" /></SelectTrigger>
                  <SelectContent>{components.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Score</Label>
                <Input type="number" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Judul *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: UTS Tilawah Al-Quran" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Membuat...' : 'Buat Penilaian'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rubric Template Dialog ── */}
      <Dialog open={rubricDialogOpen} onOpenChange={setRubricDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Rubrik</DialogTitle>
          </DialogHeader>

          {/* Existing templates */}
          <div className="space-y-3 mb-4">
            <p className="text-sm font-medium">Template Tersedia ({rubrics.length})</p>
            {rubrics.length === 0 && <p className="text-sm text-muted-foreground">Belum ada template rubrik</p>}
            {rubrics.map((r: any) => (
              <Card key={r.id} className="border">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.description || 'Tanpa deskripsi'} • Max: {r.maxScore} • {r._count?.criteria || 0} kriteria</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                      <Can permission="assessments.delete">
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteRubricMutation.mutate(r.id)}>
                          <Trash2 size={12} />
                        </Button>
                      </Can>
                    </div>
                  </div>
                  {r.criteria?.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Kriteria: {r.criteria.map((c: any) => c.name).join(', ')}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Create new template */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Buat Template Baru</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nama *</Label>
                <Input value={rubricForm.name} onChange={(e) => setRubricForm({ ...rubricForm, name: e.target.value })} placeholder="Contoh: Rubrik Tilawah" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Score</Label>
                <Input type="number" value={rubricForm.maxScore} onChange={(e) => setRubricForm({ ...rubricForm, maxScore: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deskripsi</Label>
              <Textarea value={rubricForm.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRubricForm({ ...rubricForm, description: e.target.value })} rows={2} />
            </div>

            {/* Criteria */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Kriteria Penilaian</Label>
                <Button size="sm" variant="outline" onClick={addRubricCriterion} className="gap-1">
                  <Plus size={12} /> Tambah Kriteria
                </Button>
              </div>
              {rubricCriteria.map((c, ci) => (
                <Card key={ci} className="border">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Input value={c.name} onChange={(e) => {
                        const updated = [...rubricCriteria];
                        updated[ci].name = e.target.value;
                        setRubricCriteria(updated);
                      }} placeholder="Nama kriteria" className="flex-1 mr-2" />
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRubricCriteria(rubricCriteria.filter((_, i) => i !== ci))}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-[10px]">
                      {c.levels.map((l, li) => (
                        <div key={li} className="space-y-1">
                          <Input value={l.label} onChange={(e) => {
                            const updated = [...rubricCriteria];
                            updated[ci].levels[li].label = e.target.value;
                            setRubricCriteria(updated);
                          }} className="h-7 text-[10px]" placeholder="Label" />
                          <div className="flex gap-1">
                            <Input type="number" value={l.minScore} onChange={(e) => {
                              const updated = [...rubricCriteria];
                              updated[ci].levels[li].minScore = e.target.value;
                              setRubricCriteria(updated);
                            }} className="h-7 text-[10px]" placeholder="Min" />
                            <Input type="number" value={l.maxScore} onChange={(e) => {
                              const updated = [...rubricCriteria];
                              updated[ci].levels[li].maxScore = e.target.value;
                              setRubricCriteria(updated);
                            }} className="h-7 text-[10px]" placeholder="Max" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button onClick={handleCreateRubric} disabled={createRubricMutation.isPending} className="w-full">
              {createRubricMutation.isPending ? 'Menyimpan...' : 'Simpan Template Rubrik'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
