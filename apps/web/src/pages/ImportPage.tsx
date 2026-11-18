import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  Upload, FileSpreadsheet, Columns, Eye, AlertTriangle,
  CheckCircle2, ArrowRight, ArrowLeft, Download, AlertCircle,
} from 'lucide-react';
import { useCan } from '../components/Can';

type Step = 'upload' | 'module' | 'mapping' | 'preview' | 'duplicates' | 'result';

export function ImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [module, setModule] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [sheets, setSheets] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [autoMapping, setAutoMapping] = useState<Record<string, string>>({});
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<{ key: string; label: string; required: boolean }[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [duplicates, setDuplicates] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [importMode, setImportMode] = useState<'SKIP' | 'INSERT' | 'UPDATE'>('SKIP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: levels = [] } = useQuery({
    queryKey: ['levels'],
    queryFn: () => api.get('/levels').then((r) => r.data),
  });

  const { data: years = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => api.get('/academic-years').then((r) => r.data),
  });

  const resetWizard = () => {
    setStep('upload');
    setFile(null);
    setModule('');
    setSheetName('');
    setSheets([]);
    setHeaders([]);
    setAutoMapping({});
    setColumnMapping({});
    setFields([]);
    setPreviewData(null);
    setDuplicates(null);
    setImportResult(null);
    setError('');
  };

  // Step 1: Upload
  const handleUpload = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/imports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSheets(res.data.sheets);
      if (res.data.sheets.length === 1) {
        setSheetName(res.data.sheets[0].name);
      }
      setStep('module');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengupload file');
    } finally {
      setLoading(false);
    }
  }, [file]);

  // Step 2: Select module → auto-map
  const handleModuleSelect = useCallback(async () => {
    if (!module || !sheetName || !file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', sheetName);
      formData.append('module', module);
      const res = await api.post('/imports/create-job', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setHeaders(res.data.headers);
      setAutoMapping(res.data.autoMapping);
      setColumnMapping(res.data.autoMapping);
      setFields(res.data.fields);
      setStep('mapping');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memproses');
    } finally {
      setLoading(false);
    }
  }, [module, sheetName, file]);

  // Step 3: Preview
  const handlePreview = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', sheetName);
      formData.append('module', module);
      formData.append('columnMapping', JSON.stringify(columnMapping));
      formData.append('page', '1');
      formData.append('pageSize', '20');
      const res = await api.post('/imports/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewData(res.data);
      setStep('preview');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mempreview');
    } finally {
      setLoading(false);
    }
  }, [file, sheetName, module, columnMapping]);

  // Step 4: Detect duplicates
  const handleDetectDuplicates = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', sheetName);
      formData.append('module', module);
      formData.append('columnMapping', JSON.stringify(columnMapping));
      const res = await api.post('/imports/detect-duplicates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDuplicates(res.data);
      setStep('duplicates');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mendeteksi duplikat');
    } finally {
      setLoading(false);
    }
  }, [file, sheetName, module, columnMapping]);

  // Step 5: Execute import
  const handleExecute = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', sheetName);
      formData.append('module', module);
      formData.append('columnMapping', JSON.stringify(columnMapping));
      formData.append('mode', importMode);
      const res = await api.post('/imports/execute', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      setStep('result');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengimpor data');
    } finally {
      setLoading(false);
    }
  }, [file, sheetName, module, columnMapping, importMode]);

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'upload', label: 'Upload', icon: <Upload size={16} /> },
    { key: 'module', label: 'Modul & Sheet', icon: <FileSpreadsheet size={16} /> },
    { key: 'mapping', label: 'Mapping', icon: <Columns size={16} /> },
    { key: 'preview', label: 'Preview', icon: <Eye size={16} /> },
    { key: 'duplicates', label: 'Duplikat', icon: <AlertTriangle size={16} /> },
    { key: 'result', label: 'Hasil', icon: <CheckCircle2 size={16} /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);
  const canImport = useCan('imports.create');

  if (!canImport) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Import Excel</h1>
          <p className="text-muted-foreground">Impor data santri atau pegawai dari file Excel</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Anda tidak memiliki izin untuk mengimpor data. Hubungi administrator.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import Excel</h1>
          <p className="text-muted-foreground">Impor data santri atau pegawai dari file Excel</p>
        </div>
        <Button variant="outline" onClick={resetWizard}>
          Mulai Ulang
        </Button>
      </div>

      {/* Step Indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div className={`flex items-center gap-2 ${
                  i <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    i < currentStepIndex
                      ? 'border-primary bg-primary text-primary-foreground'
                      : i === currentStepIndex
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted-foreground/30'
                  }`}>
                    {i < currentStepIndex ? <CheckCircle2 size={16} /> : s.icon}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`mx-2 h-0.5 w-8 sm:w-16 ${
                    i < currentStepIndex ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Upload File Excel</h2>
                <p className="text-sm text-muted-foreground">Pilih file Excel (.xlsx, .xls) yang ingin diimpor</p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 hover:border-primary/50 transition-colors">
                <Upload size={48} className="text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">Drag & drop file atau klik untuk memilih</p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" asChild>
                    <span className="cursor-pointer">Pilih File</span>
                  </Button>
                </label>
                {file && (
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <FileSpreadsheet size={16} className="text-green-600" />
                    <span className="font-medium">{file.name}</span>
                    <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={handleUpload} disabled={!file || loading} loading={loading}>
                  Lanjutkan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Module & Sheet */}
          {step === 'module' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Pilih Modul & Sheet</h2>
                <p className="text-sm text-muted-foreground">Pilih data yang akan diimpor dan sheet yang digunakan</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Modul Import *</Label>
                  <Select value={module} onValueChange={setModule}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Modul" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="students">Santri</SelectItem>
                      <SelectItem value="employees">PTK / Tendik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sheet *</Label>
                  <Select value={sheetName} onValueChange={setSheetName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Sheet" />
                    </SelectTrigger>
                    <SelectContent>
                      {sheets.map((s) => (
                        <SelectItem key={s.name} value={s.name}>
                          {s.name} ({s.rowCount} baris, {s.colCount} kolom)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {sheets.length > 0 && (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm font-medium mb-2">Informasi Sheet:</p>
                    {sheets.map((s) => (
                      <div key={s.name} className="text-xs text-muted-foreground">
                        <span className="font-medium">{s.name}:</span> {s.rowCount} baris, {s.colCount} kolom — Headers: {s.headers.slice(0, 5).join(', ')}{s.headers.length > 5 ? '...' : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Kembali
                </Button>
                <Button onClick={handleModuleSelect} disabled={!module || !sheetName || loading} loading={loading}>
                  Lanjutkan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Mapping Kolom</h2>
                <p className="text-sm text-muted-foreground">Map kolom Excel ke field yang sesuai di sistem</p>
              </div>

              <div className="space-y-3">
                {headers.map((header) => (
                  <div key={header} className="flex items-center gap-4">
                    <div className="w-1/3">
                      <span className="text-sm font-medium bg-muted px-3 py-2 rounded inline-block w-full truncate" title={header}>
                        {header}
                      </span>
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex-1">
                      <Select
                        value={columnMapping[header] || ''}
                        onValueChange={(v) => setColumnMapping({ ...columnMapping, [header]: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="— Tidak diimport —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— Tidak diimport —</SelectItem>
                          {fields.map((f) => (
                            <SelectItem key={f.key} value={f.key}>
                              {f.label}{f.required ? ' *' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('module')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Kembali
                </Button>
                <Button onClick={handlePreview} disabled={loading} loading={loading}>
                  Preview Data
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Preview */}
          {step === 'preview' && previewData && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Preview Data</h2>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600 font-medium">✓ {previewData.meta.totalValid} valid</span>
                  {previewData.meta.totalInvalid > 0 && (
                    <span className="text-destructive font-medium">✗ {previewData.meta.totalInvalid} error</span>
                  )}
                  <span className="text-muted-foreground">Total: {previewData.meta.total} baris</span>
                </div>
              </div>

              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Baris</TableHead>
                      <TableHead className="w-12">Status</TableHead>
                      {Object.values(columnMapping).filter(Boolean).map((fieldKey) => (
                        <TableHead key={fieldKey}>{fields.find((f) => f.key === fieldKey)?.label || fieldKey}</TableHead>
                      ))}
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.data.map((row: any) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <CheckCircle2 size={16} className="text-green-600" />
                          ) : (
                            <AlertCircle size={16} className="text-destructive" />
                          )}
                        </TableCell>
                        {Object.values(columnMapping).filter(Boolean).map((fieldKey) => (
                          <TableCell key={fieldKey} className="text-sm max-w-[200px] truncate">
                            {row.data[fieldKey] != null ? String(row.data[fieldKey]) : '-'}
                          </TableCell>
                        ))}
                        <TableCell>
                          {row.errors.length > 0 && (
                            <div className="text-xs text-destructive">
                              {row.errors.map((e: string, i: number) => (
                                <div key={i}>{e}</div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {previewData.meta.totalPages > 1 && (
                <p className="text-sm text-muted-foreground text-center">
                  Menampilkan {previewData.data.length} dari {previewData.meta.total} baris
                </p>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Kembali
                </Button>
                <Button onClick={handleDetectDuplicates} disabled={loading} loading={loading}>
                  Deteksi Duplikat
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Duplicates */}
          {step === 'duplicates' && duplicates && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Deteksi Duplikat</h2>
                <p className="text-sm text-muted-foreground">Hasil deteksi duplikat dalam file dan database</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-1">Duplikat Internal (dalam file)</p>
                    <p className="text-2xl font-bold">{duplicates.totalInternalDuplicates}</p>
                    {duplicates.internalDuplicates.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto text-xs text-muted-foreground">
                        {duplicates.internalDuplicates.map((d: any, i: number) => (
                          <div key={i}>Baris {d.row}: {d.field} = {d.value}</div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-1">Sudah Ada di Database</p>
                    <p className="text-2xl font-bold">{duplicates.totalDbDuplicates}</p>
                    {duplicates.dbDuplicates.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto text-xs text-muted-foreground">
                        {duplicates.dbDuplicates.map((d: any, i: number) => (
                          <div key={i}>Baris {d.row}: {d.field} = {d.value}</div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <Label>Mode Import *</Label>
                <Select value={importMode} onValueChange={(v: any) => setImportMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SKIP">SKIP — Lewati data yang sudah ada</SelectItem>
                    <SelectItem value="UPDATE">UPDATE — Perbarui data yang sudah ada</SelectItem>
                    <SelectItem value="INSERT">INSERT — Sisipkan semua (abaikan duplikat)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('preview')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Kembali
                </Button>
                <Button onClick={handleExecute} disabled={loading} loading={loading} variant={duplicates.totalDbDuplicates > 0 ? 'destructive' : 'default'}>
                  {duplicates.totalDbDuplicates > 0 ? 'Import dengan mode ' + importMode : 'Mulai Import'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6: Result */}
          {step === 'result' && importResult && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle2 size={48} className="mx-auto text-green-600 mb-4" />
                <h2 className="text-lg font-semibold mb-2">Import Selesai</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-lg mx-auto">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{importResult.totalRows}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground text-green-600">Berhasil</p>
                    <p className="text-2xl font-bold text-green-600">{importResult.successRows}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground text-destructive">Gagal</p>
                    <p className="text-2xl font-bold text-destructive">{importResult.failedRows}</p>
                  </CardContent>
                </Card>
              </div>

              {importResult.errors?.length > 0 && (
                <div className="rounded-lg bg-destructive/5 p-4">
                  <p className="text-sm font-medium mb-2">Detail Error:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.errors.map((err: any, i: number) => (
                      <div key={i} className="text-xs text-destructive">
                        Baris {err.row}: {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={resetWizard}>
                  Import Lagi
                </Button>
                <Button onClick={() => window.history.back()}>
                  Kembali ke Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
