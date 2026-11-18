import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useState, useRef } from 'react';
import { Save, Upload, Building2, X } from 'lucide-react';
import { toast } from 'sonner';

const UPLOAD_BASE = api.defaults.baseURL?.replace('/api', '') || '';

export function SchoolProfilePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { data: profile, isLoading } = useQuery({
    queryKey: ['school-profile'],
    queryFn: () => api.get('/school/profile').then((r) => r.data),
  });

  const [form, setForm] = useState<any>(null);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch('/school/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-profile'] });
      toast.success('Profil madrasah berhasil disimpan');
    },
  });

  const logoMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/school/profile/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-profile'] });
      setPreviewUrl(null);
      toast.success('Logo madrasah berhasil diupload');
    },
    onError: () => {
      toast.error('Gagal upload logo');
    },
  });

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-lg bg-muted" />;
  }

  const formData = form || profile || {};
  const updateField = (key: string, value: string) => {
    const newForm = { ...(form || profile), [key]: value };
    setForm(newForm);
  };

  const logoUrl = previewUrl || (formData.logo ? `${UPLOAD_BASE}/uploads/${formData.logo}` : '');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    logoMutation.mutate(file);
  };

  const removeLogo = () => {
    setPreviewUrl(null);
    updateField('logo', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profil Madrasah</h1>
          <p className="text-muted-foreground">Informasi lembaga madrasah</p>
        </div>
        <Button onClick={() => form && updateMutation.mutate(form)} loading={updateMutation.isPending} disabled={!form}>
          <Save className="mr-2 h-4 w-4" />
          Simpan
        </Button>
      </div>

      {/* Logo Upload */}
      <Card>
        <CardHeader><CardTitle className="text-base">Logo Madrasah</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/30">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo Madrasah" className="w-full h-full object-contain p-1" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Building2 className="mx-auto h-10 w-10 mb-1 opacity-40" />
                    <p className="text-[10px]">Belum ada logo</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoMutation.isPending}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  {logoMutation.isPending ? 'Uploading...' : 'Upload Logo'}
                </Button>
                {(logoUrl || previewUrl) && (
                  <Button variant="ghost" size="sm" onClick={removeLogo} className="text-destructive hover:text-destructive">
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Hapus
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
              <p className="text-[11px] text-muted-foreground text-center max-w-[160px]">
                Format: JPG, PNG, GIF, SVG. Maksimal 5MB. Logo akan tampil di kop cetakan.
              </p>
            </div>
            <div className="flex-1 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Panduan Logo</p>
              <ul className="list-disc list-inside space-y-1 text-[13px]">
                <li>Gunakan resolusi minimal <strong>200×200 pixel</strong> agar cetakan tajam</li>
                <li>Format <strong>PNG</strong> dengan background transparan direkomendasikan</li>
                <li>Logo akan ditampilkan di <strong>kop surat / hasil cetak</strong> (Jadwal, Laporan, Biodata)</li>
                <li>Ukuran tampil cetakan: ±48×48 pixel</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Identitas Lembaga</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Madrasah</Label>
              <Input value={formData.name || ''} onChange={(e) => updateField('name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>NSM</Label>
              <Input value={formData.nsm || ''} onChange={(e) => updateField('nsm', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>NPSN</Label>
              <Input value={formData.npsn || ''} onChange={(e) => updateField('npsn', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input value={formData.address || ''} onChange={(e) => updateField('address', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Desa/Kelurahan</Label>
                <Input value={formData.village || ''} onChange={(e) => updateField('village', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Kecamatan</Label>
                <Input value={formData.district || ''} onChange={(e) => updateField('district', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kabupaten</Label>
                <Input value={formData.regency || ''} onChange={(e) => updateField('regency', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Provinsi</Label>
                <Input value={formData.province || ''} onChange={(e) => updateField('province', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Kontak</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Telepon</Label>
              <Input value={formData.phone || ''} onChange={(e) => updateField('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email || ''} onChange={(e) => updateField('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={formData.website || ''} onChange={(e) => updateField('website', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Kepala Madrasah</Label>
              <Input value={formData.principalName || ''} onChange={(e) => updateField('principalName', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Visi & Misi</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Visi</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.vision || ''}
                onChange={(e) => updateField('vision', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Misi</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.mission || ''}
                onChange={(e) => updateField('mission', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sejarah</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.history || ''}
                onChange={(e) => updateField('history', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
