import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Bell, Send, History, Settings, MessageSquare, Smartphone, Mail,
  CheckCircle2, XCircle, Clock, AlertCircle, Plus, Trash2, Edit, Eye,
  Zap, Users, GraduationCap, CreditCard, FileText, Filter,
} from 'lucide-react';

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ATTENDANCE_ALERT: { label: 'Alert Absen', color: 'bg-red-100 text-red-800', icon: <AlertCircle size={14} /> },
  GRADE_ANNOUNCEMENT: { label: 'Pengumuman Nilai', color: 'bg-purple-100 text-purple-800', icon: <GraduationCap size={14} /> },
  PAYMENT_REMINDER: { label: 'Pengingat Pembayaran', color: 'bg-orange-100 text-orange-800', icon: <CreditCard size={14} /> },
  GENERAL: { label: 'Umum', color: 'bg-blue-100 text-blue-800', icon: <Bell size={14} /> },
};

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  WHATSAPP: { label: 'WhatsApp', icon: <Smartphone size={14} /> },
  SMS: { label: 'SMS', icon: <MessageSquare size={14} /> },
  IN_APP: { label: 'In-App', icon: <Bell size={14} /> },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SENT: { label: 'Terkirim', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 size={14} /> },
  DELIVERED: { label: 'Diterima', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle2 size={14} /> },
  FAILED: { label: 'Gagal', color: 'bg-red-100 text-red-800', icon: <XCircle size={14} /> },
  PENDING: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-800', icon: <Clock size={14} /> },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-800', icon: <XCircle size={14} /> },
};

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('send');
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [sendType, setSendType] = useState<string>('GENERAL');
  const [sendChannel, setSendChannel] = useState<string>('WHATSAPP');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('all');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('all');

  // ── Send Form ──
  const [sendForm, setSendForm] = useState({
    recipientName: '', recipientPhone: '', subject: '', message: '',
  });

  // ── Template Form ──
  const [templateForm, setTemplateForm] = useState({
    name: '', type: 'GENERAL' as string, subject: '', message: '',
  });

  // ── Queries ──
  const { data: templates = [] } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () => api.get('/notifications/templates').then((r) => r.data),
  });

  const { data: logsResponse } = useQuery({
    queryKey: ['notification-logs', logTypeFilter, logStatusFilter],
    queryFn: () => {
      const params: any = { pageSize: 50 };
      if (logTypeFilter !== 'all') params.type = logTypeFilter;
      if (logStatusFilter !== 'all') params.status = logStatusFilter;
      return api.get('/notifications/logs', { params }).then((r) => r.data);
    },
  });
  const logs = logsResponse?.data || [];

  const { data: stats } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: () => api.get('/notifications/stats').then((r) => r.data),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => api.get('/students', { params: { pageSize: 200 } }).then((r) => r.data?.data || []),
  });

  // ── Mutations ──
  const sendMutation = useMutation({
    mutationFn: (data: any) => api.post('/notifications/send', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      setSendDialogOpen(false);
      setSendForm({ recipientName: '', recipientPhone: '', subject: '', message: '' });
      if (res.data?.success) {
        toast.success('Notifikasi berhasil dikirim');
      } else {
        toast.error(res.data?.errorMessage || 'Gagal mengirim notifikasi');
      }
    },
    onError: () => toast.error('Gagal mengirim notifikasi'),
  });

  const sendAttendanceAlertMutation = useMutation({
    mutationFn: (sessionId: string) => api.post(`/notifications/send/attendance-alert/${sessionId}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      toast.success(`${res.data?.sent || 0} notifikasi berhasil dikirim ke ${res.data?.absentCount || 0} orang tua yang tidak hadir`);
    },
    onError: () => toast.error('Gagal mengirim alert kehadiran'),
  });

  const sendGradeMutation = useMutation({
    mutationFn: (assessmentId: string) => api.post(`/notifications/send/grade-announcement/${assessmentId}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      toast.success(`${res.data?.sent || 0} pengumuman nilai berhasil dikirim`);
    },
    onError: () => toast.error('Gagal mengirim pengumuman nilai'),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: any) => editingTemplate
      ? api.patch(`/notifications/templates/${editingTemplate.id}`, data)
      : api.post('/notifications/templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ name: '', type: 'GENERAL', subject: '', message: '' });
      toast.success(editingTemplate ? 'Template berhasil diperbarui' : 'Template berhasil dibuat');
    },
    onError: () => toast.error('Gagal menyimpan template'),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template berhasil dihapus');
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/logs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      toast.success('Log berhasil dihapus');
    },
  });

  const handleSend = () => {
    if (!sendForm.recipientName || !sendForm.recipientPhone || !sendForm.subject || !sendForm.message) {
      toast.error('Lengkapi semua field');
      return;
    }
    sendMutation.mutate({
      type: sendType,
      channel: sendChannel,
      ...sendForm,
    });
  };

  const handleSendToStudent = (student: any) => {
    const phone = student.guardianPhone || student.parents?.[0]?.phone || '';
    setSendForm({
      recipientName: student.fullName,
      recipientPhone: phone,
      subject: '',
      message: '',
    });
    setSendDialogOpen(true);
  };

  const handleCreateTemplate = () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.message) {
      toast.error('Lengkapi semua field');
      return;
    }
    createTemplateMutation.mutate(templateForm);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifikasi</h1>
          <p className="text-muted-foreground">Kirim notifikasi ke orang tua via WhatsApp / SMS</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', type: 'GENERAL', subject: '', message: '' }); setTemplateDialogOpen(true); }} className="gap-2">
            <Settings className="h-4 w-4" /> Kelola Template
          </Button>
          <Button onClick={() => setSendDialogOpen(true)} className="gap-2">
            <Send className="h-4 w-4" /> Kirim Notifikasi
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Terkirim</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Berhasil</p>
            <p className="text-2xl font-bold text-green-600">{stats.byStatus?.SENT || 0}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Gagal</p>
            <p className="text-2xl font-bold text-red-600">{stats.byStatus?.FAILED || 0}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
              <Smartphone size={14} /> WhatsApp
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.byChannel?.WHATSAPP || 0}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
              <MessageSquare size={14} /> SMS
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.byChannel?.SMS || 0}</p>
          </CardContent></Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="send" className="gap-2"><Send className="h-4 w-4" /> Kirim</TabsTrigger>
          <TabsTrigger value="quick" className="gap-2"><Zap className="h-4 w-4" /> Cepat</TabsTrigger>
          <TabsTrigger value="templates" className="gap-2"><FileText className="h-4 w-4" /> Template</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Riwayat</TabsTrigger>
        </TabsList>

        {/* ── Send Tab ── */}
        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kirim Notifikasi Manual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jenis Notifikasi</Label>
                  <Select value={sendType} onValueChange={setSendType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select value={sendChannel} onValueChange={setSendChannel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Penerima</Label>
                  <Input value={sendForm.recipientName} onChange={(e) => setSendForm({ ...sendForm, recipientName: e.target.value })} placeholder="Nama orang tua / wali" />
                </div>
                <div className="space-y-2">
                  <Label>Nomor WhatsApp / SMS</Label>
                  <Input value={sendForm.recipientPhone} onChange={(e) => setSendForm({ ...sendForm, recipientPhone: e.target.value })} placeholder="08xxxxxxxxxx" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subjek</Label>
                <Input value={sendForm.subject} onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })} placeholder="Subjek notifikasi" />
              </div>
              <div className="space-y-2">
                <Label>Pesan</Label>
                <Textarea value={sendForm.message} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSendForm({ ...sendForm, message: e.target.value })} placeholder="Tulis pesan notifikasi..." rows={6} />
              </div>
              <Button onClick={handleSend} disabled={sendMutation.isPending} className="gap-2">
                <Send className="h-4 w-4" /> {sendMutation.isPending ? 'Mengirim...' : 'Kirim Sekarang'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Quick Actions Tab ── */}
        <TabsContent value="quick" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aksi Cepat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Send to all students */}
                <Card className="border-2 border-dashed border-red-200 hover:border-red-400 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><AlertCircle size={20} className="text-red-600" /></div>
                      <div>
                        <p className="font-medium">Kirim ke Semua Santri</p>
                        <p className="text-xs text-muted-foreground">Pilih santri untuk kirim notifikasi</p>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-auto space-y-1">
                      {students.slice(0, 20).map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between p-2 rounded hover:bg-muted text-sm">
                          <span>{s.fullName}</span>
                          <Button size="sm" variant="ghost" onClick={() => handleSendToStudent(s)}>
                            <Send size={12} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Bulk actions */}
                <div className="space-y-3">
                  <Card className="border-2 border-dashed border-orange-200 hover:border-orange-400 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center"><CreditCard size={20} className="text-orange-600" /></div>
                        <div>
                          <p className="font-medium">Pengingat SPP</p>
                          <p className="text-xs text-muted-foreground">Kirim pengingat pembayaran SPP</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-dashed border-purple-200 hover:border-purple-400 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><GraduationCap size={20} className="text-purple-600" /></div>
                        <div>
                          <p className="font-medium">Pengumuman Nilai</p>
                          <p className="text-xs text-muted-foreground">Kirim pengumuman penilaian ke orang tua</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-dashed border-green-200 hover:border-green-400 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><Users size={20} className="text-green-600" /></div>
                        <div>
                          <p className="font-medium">Info Umum</p>
                          <p className="text-xs text-muted-foreground">Kirim pengumuman umum ke semua orang tua</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Templates Tab ── */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', type: 'GENERAL', subject: '', message: '' }); setTemplateDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Tambah Template
            </Button>
          </div>
          {templates.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={TYPE_CONFIG[t.type]?.color || 'bg-gray-100'}>
                      {TYPE_CONFIG[t.type]?.icon} <span className="ml-1">{TYPE_CONFIG[t.type]?.label || t.type}</span>
                    </Badge>
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.isActive ? 'default' : 'secondary'}>
                      {t.isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{t._count?.logs || 0} terkirim</span>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setEditingTemplate(t);
                      setTemplateForm({ name: t.name, type: t.type, subject: t.subject, message: t.message });
                      setTemplateDialogOpen(true);
                    }}><Edit size={14} /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTemplateMutation.mutate(t.id)}><Trash2 size={14} /></Button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2">{t.message}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex gap-3">
            <Select value={logTypeFilter} onValueChange={setLogTypeFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Jenis" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={logStatusFilter} onValueChange={setLogStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Penerima</TableHead>
                    <TableHead>Subjek</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Belum ada riwayat notifikasi
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <Badge className={TYPE_CONFIG[log.type]?.color || 'bg-gray-100'} variant="outline">
                            {TYPE_CONFIG[log.type]?.icon}
                            <span className="ml-1 text-xs">{TYPE_CONFIG[log.type]?.label || log.type}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            {CHANNEL_CONFIG[log.channel]?.icon}
                            <span className="text-xs">{CHANNEL_CONFIG[log.channel]?.label || log.channel}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{log.recipientName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{log.recipientPhone}</p>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{log.subject}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_CONFIG[log.status]?.color || 'bg-gray-100'}>
                            {STATUS_CONFIG[log.status]?.icon}
                            <span className="ml-1">{STATUS_CONFIG[log.status]?.label || log.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => deleteLogMutation.mutate(log.id)}>
                            <Trash2 size={12} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Send Dialog ── */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Kirim Notifikasi</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select value={sendType} onValueChange={setSendType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={sendChannel} onValueChange={setSendChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nama Penerima</Label>
              <Input value={sendForm.recipientName} onChange={(e) => setSendForm({ ...sendForm, recipientName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nomor Telepon</Label>
              <Input value={sendForm.recipientPhone} onChange={(e) => setSendForm({ ...sendForm, recipientPhone: e.target.value })} placeholder="08xxxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label>Subjek</Label>
              <Input value={sendForm.subject} onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Pesan</Label>
              <Textarea value={sendForm.message} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSendForm({ ...sendForm, message: e.target.value })} rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSend} disabled={sendMutation.isPending}>
              {sendMutation.isPending ? 'Mengirim...' : 'Kirim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Template Dialog ── */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Template Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Template</Label>
              <Input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="Contoh: Alert Absen" />
            </div>
            <div className="space-y-2">
              <Label>Jenis</Label>
              <Select value={templateForm.type} onValueChange={(v) => setTemplateForm({ ...templateForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subjek</Label>
              <Input value={templateForm.subject} onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Pesan (gunakan {`{variable}`} untuk personalisasi)</Label>
              <Textarea value={templateForm.message} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTemplateForm({ ...templateForm, message: e.target.value })} rows={8} placeholder="Assalamu'alaikum Wr. Wb.&#10;&#10;Informasi kehadiran {student_name}:&#10;Kelas: {class}&#10;Status: {status}&#10;&#10;Hormat kami,&#10;{school_name}" />
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Variabel tersedia:</p>
              <div className="flex flex-wrap gap-1">
                {['{student_name}', '{class}', '{subject}', '{date}', '{score}', '{max_score}', '{assessment_name}', '{amount}', '{due_date}', '{description}', '{school_name}'].map((v) => (
                  <Badge key={v} variant="secondary" className="text-[10px] font-mono">{v}</Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Batal</Button>
            <Button onClick={handleCreateTemplate} disabled={createTemplateMutation.isPending}>
              {createTemplateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
