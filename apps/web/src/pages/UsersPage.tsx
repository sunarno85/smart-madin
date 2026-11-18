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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Shield, Key, UserCheck, UserX, Edit, Eye } from 'lucide-react';
import { formatStatus, getStatusColor } from '../lib/utils';
import { Can } from '../components/Can';

export function UsersPage() {
  const queryClient = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<string | null>(null);
  const [openPassword, setOpenPassword] = useState<string | null>(null);
  const [openDetail, setOpenDetail] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    username: '', email: '', password: '', fullName: '', roleIds: [] as string[],
  });
  const [editForm, setEditForm] = useState({ email: '', fullName: '', roleIds: [] as string[] });
  const [newPassword, setNewPassword] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r) => r.data),
  });

  const { data: detailUser } = useQuery({
    queryKey: ['user', openDetail],
    queryFn: () => api.get(`/users/${openDetail}`).then((r) => r.data),
    enabled: !!openDetail,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpenCreate(false);
      setCreateForm({ username: '', email: '', password: '', fullName: '', roleIds: [] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setOpenEdit(null);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: ({ id, password }: any) => api.patch(`/users/${id}/reset-password`, { password }),
    onSuccess: () => {
      setOpenPassword(null);
      setNewPassword('');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/toggle-active`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleEdit = (user: any) => {
    setEditForm({
      email: user.email,
      fullName: user.fullName || '',
      roleIds: user.roles?.map((r: any) => r.role?.id || r.id) || [],
    });
    setOpenEdit(user.id);
  };

  const handleEditSave = () => {
    if (!openEdit) return;
    updateMutation.mutate({ id: openEdit, data: editForm });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pengguna</h1>
          <p className="text-muted-foreground">Manajemen pengguna dan akses sistem</p>
        </div>
        <Can permission="users.create">
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Tambah Pengguna</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Tambah Pengguna Baru</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(createForm); }} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Username *</Label>
                  <Input value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nama Lengkap</Label>
                  <Input value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Password *</Label>
                  <Input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required minLength={6} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role: any) => (
                    <label key={role.id} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      createForm.roleIds.includes(role.id) ? 'bg-primary/10 border-primary text-primary' : 'hover:bg-muted'
                    }`}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={createForm.roleIds.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCreateForm({ ...createForm, roleIds: [...createForm.roleIds, role.id] });
                          } else {
                            setCreateForm({ ...createForm, roleIds: createForm.roleIds.filter((id) => id !== role.id) });
                          }
                        }}
                      />
                      <Shield size={14} />
                      {role.name}
                    </label>
                  ))}
                </div>
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

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Pengguna ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Login Terakhir</TableHead>
                <TableHead className="w-32">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-full animate-pulse rounded bg-muted" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Tidak ada pengguna</TableCell>
                </TableRow>
              ) : (
                users.map((user: any, i: number) => (
                  <TableRow key={user.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{user.username}</TableCell>
                    <TableCell className="font-medium">{user.fullName || '-'}</TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles?.map((r: any) => (
                          <span key={r.role?.id || r.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            <Shield size={10} />
                            {r.role?.name || r.name}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {user.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('id-ID') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Detail" onClick={() => setOpenDetail(user.id)}>
                          <Eye size={16} />
                        </Button>
                        <Can permission="users.update">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => handleEdit(user)}>
                            <Edit size={16} />
                          </Button>
                        </Can>
                        <Can permission="users.manage">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset Password" onClick={() => { setOpenPassword(user.id); setNewPassword(''); }}>
                            <Key size={16} />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            title={user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            onClick={() => toggleActiveMutation.mutate(user.id)}
                          >
                            {user.isActive ? <UserX size={16} className="text-destructive" /> : <UserCheck size={16} className="text-green-600" />}
                          </Button>
                        </Can>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!openEdit} onOpenChange={(o) => !o && setOpenEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Pengguna</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role: any) => (
                  <label key={role.id} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                    editForm.roleIds.includes(role.id) ? 'bg-primary/10 border-primary text-primary' : 'hover:bg-muted'
                  }`}>
                    <input
                      type="checkbox" className="sr-only"
                      checked={editForm.roleIds.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditForm({ ...editForm, roleIds: [...editForm.roleIds, role.id] });
                        } else {
                          setEditForm({ ...editForm, roleIds: editForm.roleIds.filter((id) => id !== role.id) });
                        }
                      }}
                    />
                    <Shield size={14} />
                    {role.name}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEdit(null)}>Batal</Button>
              <Button onClick={handleEditSave} loading={updateMutation.isPending}>Simpan</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={!!openPassword} onOpenChange={(o) => !o && setOpenPassword(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Password Baru *</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenPassword(null)}>Batal</Button>
              <Button onClick={() => openPassword && passwordMutation.mutate({ id: openPassword, password: newPassword })} loading={passwordMutation.isPending} disabled={newPassword.length < 6}>
                Reset Password
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!openDetail} onOpenChange={(o) => !o && setOpenDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detail Pengguna</DialogTitle></DialogHeader>
          {detailUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-medium">{detailUser.username}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{detailUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nama Lengkap</p>
                  <p className="font-medium">{detailUser.fullName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${detailUser.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {detailUser.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Login Terakhir</p>
                  <p className="font-medium text-sm">{detailUser.lastLoginAt ? new Date(detailUser.lastLoginAt).toLocaleString('id-ID') : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dibuat</p>
                  <p className="font-medium text-sm">{new Date(detailUser.createdAt).toLocaleString('id-ID')}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Roles & Permissions</p>
                {detailUser.roles?.map((r: any) => (
                  <div key={r.id} className="rounded-lg border p-3 mb-2">
                    <p className="font-medium text-sm flex items-center gap-2"><Shield size={14} />{r.role.name}</p>
                    {r.role.permissions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.role.permissions.map((rp: any) => (
                          <span key={rp.permission.id} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">
                            {rp.permission.module}.{rp.permission.action}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
