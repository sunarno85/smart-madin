import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowRight, Copy, GraduationCap, Repeat, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Can } from '../components/Can';

type Action = 'PROMOTE' | 'REPEAT' | 'GRADUATE';

interface Decision {
  action: Action;
  targetClassId: string;
}

const actionLabel: Record<Action, string> = {
  PROMOTE: 'Naik Kelas',
  REPEAT: 'Tinggal Kelas',
  GRADUATE: 'Lulus',
};

export function KenaikanKelasPage() {
  const queryClient = useQueryClient();
  const [fromYearId, setFromYearId] = useState<string>('');
  const [toYearId, setToYearId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => api.get('/academic-years').then((r) => r.data),
  });

  const { data: fromClasses } = useQuery({
    queryKey: ['classes', fromYearId],
    queryFn: () => api.get('/classes', { params: { academicYearId: fromYearId } }).then((r) => r.data),
    enabled: !!fromYearId,
  });

  const classList: any[] = Array.isArray(fromClasses) ? fromClasses : [];

  const previewEnabled = !!fromYearId && !!toYearId && !!classId && fromYearId !== toYearId;
  const { data: preview, isFetching } = useQuery({
    queryKey: ['promotion-preview', fromYearId, toYearId, classId],
    queryFn: () =>
      api
        .get('/promotion/preview', { params: { fromAcademicYearId: fromYearId, toAcademicYearId: toYearId, classId } })
        .then((r) => r.data),
    enabled: previewEnabled,
  });

  const { data: targetClassesData } = useQuery({
    queryKey: ['classes', toYearId],
    queryFn: () => api.get('/classes', { params: { academicYearId: toYearId } }).then((r) => r.data),
    enabled: !!toYearId,
  });
  const targetClassList: any[] = Array.isArray(targetClassesData) ? targetClassesData : [];

  // Default year selection: from = active year, to = next year after it
  useEffect(() => {
    if (!years?.length || fromYearId) return;
    const active = years.find((y: any) => y.isActive) ?? years[0];
    if (active) {
      setFromYearId(active.id);
      const idx = years.findIndex((y: any) => y.id === active.id);
      const next = years[idx - 1]; // years are ordered by startDate desc
      if (next) setToYearId(next.id);
    }
  }, [years, fromYearId]);

  // Initialize decisions from preview suggestions
  useEffect(() => {
    if (!preview?.students) return;
    const next: Record<string, Decision> = {};
    for (const s of preview.students) {
      const suggestion: Action =
        preview.suggestions?.promote ? 'PROMOTE' : preview.suggestions?.repeat ? 'REPEAT' : 'GRADUATE';
      const targetClassId =
        suggestion === 'PROMOTE'
          ? preview.suggestions?.promote
          : suggestion === 'REPEAT'
            ? preview.suggestions?.repeat
            : '';
      if (s.student.status === 'ACTIVE') {
        next[s.student.id] = { action: suggestion, targetClassId };
      } else {
        next[s.student.id] = { action: 'GRADUATE', targetClassId: '' };
      }
    }
    setDecisions(next);
  }, [preview]);

  const rolloverMutation = useMutation({
    mutationFn: () => api.post('/promotion/rollover-classes', { fromAcademicYearId: fromYearId, toAcademicYearId: toYearId }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success(`${res.data.copied} kelas berhasil disalin ke tahun ajaran tujuan`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gagal menyalin struktur kelas'),
  });

  const executeMutation = useMutation({
    mutationFn: () =>
      api.post('/promotion/execute', {
        fromAcademicYearId: fromYearId,
        toAcademicYearId: toYearId,
        items: Object.entries(decisions).map(([studentId, d]) => ({
          studentId,
          action: d.action,
          targetClassId: d.action === 'GRADUATE' ? undefined : d.targetClassId || undefined,
        })),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['promotion-preview'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success(
        `Selesai: ${res.data.promoted} naik, ${res.data.repeated} tinggal, ${res.data.graduated} lulus`,
      );
      setConfirmOpen(false);
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Gagal memproses kenaikan kelas');
      setConfirmOpen(false);
    },
  });

  const targetYearHasClasses = previewEnabled && targetClassList.length > 0;

  const summary = useMemo(() => {
    const counts: Record<Action, number> = { PROMOTE: 0, REPEAT: 0, GRADUATE: 0 };
    Object.values(decisions).forEach((d) => counts[d.action]++);
    return counts;
  }, [decisions]);

  const invalidSelection = Object.values(decisions).some(
    (d) => d.action !== 'GRADUATE' && !d.targetClassId,
  );

  const yearsOptions = years ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kenaikan Kelas</h1>
        <p className="text-muted-foreground">
          Proses naik kelas, tinggal kelas, dan kelulusan santri antar tahun ajaran
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilih Tahun Ajaran & Kelas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Tahun Ajaran Asal</Label>
            <Select value={fromYearId} onValueChange={(v) => { setFromYearId(v); setClassId(''); }}>
              <SelectTrigger><SelectValue placeholder="Pilih tahun ajaran" /></SelectTrigger>
              <SelectContent>
                {yearsOptions.map((y: any) => (
                  <SelectItem key={y.id} value={y.id}>{y.name}{y.isActive ? ' (aktif)' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Kelas Asal</Label>
            <Select value={classId} onValueChange={setClassId} disabled={!fromYearId}>
              <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
              <SelectContent>
                {classList.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} — {c.level?.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tahun Ajaran Tujuan</Label>
            <Select value={toYearId} onValueChange={setToYearId}>
              <SelectTrigger><SelectValue placeholder="Pilih tahun ajaran" /></SelectTrigger>
              <SelectContent>
                {yearsOptions.filter((y: any) => y.id !== fromYearId).map((y: any) => (
                  <SelectItem key={y.id} value={y.id}>{y.name}{y.isActive ? ' (aktif)' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {previewEnabled && !targetYearHasClasses && (
        <Can permission="promotion.manage">
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-medium">Tahun ajaran tujuan belum memiliki kelas</p>
              <p className="text-sm text-muted-foreground">
                Salin struktur kelas dari tahun ajaran asal agar santri bisa dipindahkan.
              </p>
            </div>
            <Button onClick={() => rolloverMutation.mutate()} disabled={rolloverMutation.isPending}>
              <Copy className="mr-2 h-4 w-4" />
              {rolloverMutation.isPending ? 'Menyalin...' : 'Salin Struktur Kelas'}
            </Button>
          </CardContent>
        </Card>
        </Can>
      )}

      {preview && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              Santri Kelas {preview.fromClass.name}{' '}
              <Badge variant="outline" className="ml-2">{preview.fromClass.level?.name}</Badge>
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              Tujuan: {preview.targetYear?.name ?? '-'}
            </span>
          </CardHeader>
          <CardContent>
            {preview.students.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Tidak ada santri aktif di kelas ini</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">No</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead>Nama Santri</TableHead>
                    <TableHead className="w-44">Keputusan</TableHead>
                    <TableHead>Kelas Tujuan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.students.map((s: any, i: number) => {
                    const d = decisions[s.student.id] ?? { action: 'PROMOTE' as Action, targetClassId: '' };
                    return (
                      <TableRow key={s.student.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{s.student.studentNumber}</TableCell>
                        <TableCell className="font-medium">{s.student.fullName}</TableCell>
                        <TableCell>
                          <Select
                            value={d.action}
                            onValueChange={(v: Action) =>
                              setDecisions((prev) => ({
                                ...prev,
                                [s.student.id]: {
                                  action: v,
                                  targetClassId:
                                    v === 'PROMOTE'
                                      ? preview.suggestions?.promote ?? ''
                                      : v === 'REPEAT'
                                        ? preview.suggestions?.repeat ?? ''
                                        : '',
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PROMOTE">
                                <span className="flex items-center gap-2"><TrendingUp size={14} /> Naik Kelas</span>
                              </SelectItem>
                              <SelectItem value="REPEAT">
                                <span className="flex items-center gap-2"><Repeat size={14} /> Tinggal Kelas</span>
                              </SelectItem>
                              <SelectItem value="GRADUATE">
                                <span className="flex items-center gap-2"><GraduationCap size={14} /> Lulus</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {d.action === 'GRADUATE' ? (
                            <span className="text-sm text-muted-foreground">—</span>
                          ) : (
                            <Select
                              value={d.targetClassId}
                              onValueChange={(v) =>
                                setDecisions((prev) => ({ ...prev, [s.student.id]: { ...d, targetClassId: v } }))
                              }
                            >
                              <SelectTrigger className="h-9 w-52"><SelectValue placeholder="Pilih kelas tujuan" /></SelectTrigger>
                              <SelectContent>
                                {preview.targetClasses.map((c: any) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name} — {c.level?.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {preview.students.length > 0 && (
              <div className="mt-4 flex flex-col items-start justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    Naik: {summary.PROMOTE}
                  </Badge>
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                    Tinggal: {summary.REPEAT}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                    Lulus: {summary.GRADUATE}
                  </Badge>
                  {invalidSelection && (
                    <span className="text-sm text-destructive">
                      Ada santri dengan kelas tujuan yang belum dipilih
                    </span>
                  )}
                </div>
                <Can permission="promotion.manage">
                  <Button
                    onClick={() => setConfirmOpen(true)}
                    disabled={executeMutation.isPending || invalidSelection}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Proses Kenaikan ({preview.students.length} santri)
                  </Button>
                </Can>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {previewEnabled && isFetching && !preview && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Memuat data santri...</CardContent></Card>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Konfirmasi Proses Kenaikan</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              Proses <strong>{preview?.fromClass.name}</strong> ({preview?.targetYear?.name ?? '-'}) ke{' '}
              <strong>{preview?.targetYear?.name}</strong>?
            </p>
            <ul className="list-disc pl-5 text-muted-foreground">
              <li>{summary.PROMOTE} santri naik kelas</li>
              <li>{summary.REPEAT} santri tinggal kelas</li>
              <li>{summary.GRADUATE} santri lulus (status menjadi LULUS)</li>
            </ul>
            <p className="text-destructive">
              Tindakan ini mengubah riwayat kelas santri dan tidak dapat dibatalkan.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Batal</Button>
            <Button onClick={() => executeMutation.mutate()} disabled={executeMutation.isPending}>
              {executeMutation.isPending ? 'Memproses...' : 'Ya, Proses'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
