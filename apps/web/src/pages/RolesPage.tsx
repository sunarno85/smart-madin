import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Shield, Edit, Trash2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { Can } from '../components/Can';

const MODULE_LABELS: Record<string, string> = {
  students: 'Santri',
  employees: 'Pegawai',
  classes: 'Kelas',
  schedules: 'Jadwal',
  subjects: 'Mata Pelajaran',
  reports: 'Laporan',
  imports: 'Import',
  users: 'Pengguna',
  settings: 'Pengaturan',
  announcements: 'Pengumuman',
};

const ACTION_LABELS: Record<string, string> = {
  read: 'Lihat',
  create: 'Tambah',
  update: 'Edit',
  delete: 'Hapus',
  manage: 'Kelola',
};

export function RolesPage() {
  const queryClient = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<string | null>(null);
  const [openPermissions, setOpenPermissions] = useState<string | null>(null);
  const [openDelete, setOpenDelete] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [permForm, setPermForm] = useState<Record<string, string[]>>({});

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r) => r.data),
  });

  const { data: permTree = {} } = useQuery({
    queryKey: ['permission-tree'],
    queryFn: () => api.get('/roles/permissions/tree').then((r) => r.data),
  });

  const { data: detailRole } = useQuery({
    queryKey: ['role', openPermissions],
    queryFn: () => api.get(`/roles/${openPermissions}`).then((r) => r.data),
    enabled: !!openPermissions,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setOpenCreate(false);
      setCreateForm({ name: '', description: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setOpenEdit(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setOpenDelete(null);
    },
  });

  const savePermissionsMutation = useMutation({
    mutationFn: ({ id, permissions }: any) => api.patch(`/roles/${id}/permissions/set`, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role'] });
      setOpenPermissions(null);
    },
  });

  const resetPermissionsMutation = useMutation({
    mutationFn: (id: string) => api.post(`/roles/${id}/reset-permissions`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role'] });
    },
  });

  // Initialize permission form when role is loaded
  const initPermForm = () => {
    if (!detailRole) return;
    const form: Record<string, string[]> = {};
    for (const rp of detailRole.permissions || []) {
      const mod = rp.permission.module;
      if (!form[mod]) form[mod] = [];
      form[mod].push(rp.permission.action);
    }
    setPermForm(form);
  };

  // Open permissions dialog and initialize
  const handleOpenPermissions = (roleId: string) => {
    setOpenPermissions(roleId);
    setPermForm({});
    // Will be initialized when detailRole loads
  };

  // Toggle a permission
  const togglePerm = (module: string, action: string) => {
    setPermForm((prev) => {
      const current = prev[module] || [];
      if (current.includes(action)) {
        return { ...prev, [module]: current.filter((a) => a !== action) };
      } else {
        return { ...prev, [module]: [...current, action] };
      }
    });
  };

  // Toggle all permissions for a module
  const toggleModuleAll = (module: string) => {
    const allActions = Object.keys(ACTION_LABELS);
    setPermForm((prev) => {
      const current = prev[module] || [];
      if (current.length === allActions.length) {
        return { ...prev, [module]: [] };
      } else {
        return { ...prev, [module]: [...allActions] };
      }
    });
  };

  // Initialize form when detail loads
  if (openPermissions && detailRole && Object.keys(permForm).length === 0) {
    const form: Record<string, string[]> = {};
    for (const rp of detailRole.permissions || []) {
      const mod = rp.permission.module;
      if (!form[mod]) form[mod] = [];
      form[mod].push(rp.permission.action);
    }
    if (Object.keys(form).length > 0 || detailRole.permissions?.length === 0) {
      // Use state update in render (safe here since it's a one-time init)
      setTimeout(() => setPermForm(form), 0);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Role & Permission</h1>
          <p className="text-muted-foreground">Kelola role dan hak akses pengguna</p>
        </div>
        <Can permission="roles.create">
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Tambah Role</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Role Baru</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(createForm); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Role *</Label>
                <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })} required placeholder="CONTOH_ROLE" />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Input value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
                <Button type="submit" loading={createMutation.isPending}>Simpan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </Can>
      </div>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Role</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Pengguna</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="w-32">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-full animate-pulse rounded bg-muted" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Tidak ada role</TableCell>
                </TableRow>
              ) : (
                roles.map((role: any, i: number) => (
                  <TableRow key={role.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <Shield size={16} className="text-primary" />
                        {role.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{role.description || '-'}</TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{role.permissions?.length || 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{role._count?.users || 0}</span>
                    </TableCell>
                    <TableCell>
                      {role.isSystem ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">System</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">Custom</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Can permission="roles.manage">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Permissions" onClick={() => handleOpenPermissions(role.id)}>
                            <Shield size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset ke Default" onClick={() => resetPermissionsMutation.mutate(role.id)} disabled={resetPermissionsMutation.isPending}>
                            <RotateCcw size={14} />
                          </Button>
                        </Can>
                        {!role.isSystem && (
                          <>
                            <Can permission="roles.update">
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => { setEditForm({ name: role.name, description: role.description || '' }); setOpenEdit(role.id); }}>
                                <Edit size={16} />
                              </Button>
                            </Can>
                            <Can permission="roles.delete">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Hapus" onClick={() => setOpenDelete(role.id)}>
                                <Trash2 size={16} />
                              </Button>
                            </Can>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permission Matrix Dialog */}
      <Dialog open={!!openPermissions} onOpenChange={(o) => !o && setOpenPermissions(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Permission — {detailRole?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {Object.entries(permTree).map(([module, actions]) => {
              const moduleActions = actions as string[];
              const selected = permForm[module] || [];
              const allSelected = moduleActions.every((a) => selected.includes(a));

              return (
                <div key={module} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded"
                        checked={allSelected}
                        onChange={() => toggleModuleAll(module)}
                      />
                      <span className="font-medium">{MODULE_LABELS[module] || module}</span>
                      <span className="text-xs text-muted-foreground">({selected.length}/{moduleActions.length})</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {moduleActions.map((action) => {
                      const isSelected = selected.includes(action);
                      return (
                        <button
                          key={action}
                          onClick={() => togglePerm(module, action)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                            isSelected
                              ? 'bg-green-50 border-green-300 text-green-700'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {isSelected ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {ACTION_LABELS[action] || action}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPermissions(null)}>Batal</Button>
            <Button
              onClick={() => {
                if (!openPermissions) return;
                const permissions = Object.entries(permForm)
                  .filter(([, actions]) => actions.length > 0)
                  .map(([module, actions]) => ({ module, actions }));
                savePermissionsMutation.mutate({ id: openPermissions, permissions });
              }}
              loading={savePermissionsMutation.isPending}
            >
              Simpan Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!openEdit} onOpenChange={(o) => !o && setOpenEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Role</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Role</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEdit(null)}>Batal</Button>
              <Button onClick={() => openEdit && updateMutation.mutate({ id: openEdit, data: editForm })} loading={updateMutation.isPending}>Simpan</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!openDelete} onOpenChange={(o) => !o && setOpenDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Role</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Apakah Anda yakin ingin menghapus role ini? Role harus tidak memiliki pengguna.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDelete(null)}>Batal</Button>
            <Button variant="destructive" loading={deleteMutation.isPending} onClick={() => openDelete && deleteMutation.mutate(openDelete)}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
