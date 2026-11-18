import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Search, Users, GraduationCap, BookOpen, Calendar, ClipboardList, BarChart3, Settings, ArrowRight, ClipboardCheck, FileUp } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  url: string;
  category: string;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  // Search students
  const { data: students } = useQuery({
    queryKey: ['search-students', query],
    queryFn: () => api.get(`/students?limit=10&search=${encodeURIComponent(query)}`).then((r) => r.data),
    enabled: open && query.length >= 2,
  });

  // Search employees
  const { data: employees } = useQuery({
    queryKey: ['search-employees', query],
    queryFn: () => api.get(`/employees?limit=10&search=${encodeURIComponent(query)}`).then((r) => r.data),
    enabled: open && query.length >= 2,
  });

  const staticPages: SearchResult[] = [
    { id: 'dashboard', title: 'Dashboard', subtitle: 'Ringkasan data', icon: <BarChart3 size={16} />, url: '/dashboard', category: 'Halaman' },
    { id: 'jadwal', title: 'Jadwal Pelajaran', subtitle: 'Manajemen jadwal', icon: <Calendar size={16} />, url: '/schedules', category: 'Akademik' },
    { id: 'presensi', title: 'Presensi', subtitle: 'Kehadiran santri', icon: <ClipboardCheck size={16} />, url: '/attendance', category: 'Akademik' },
    { id: 'penilaian', title: 'Penilaian', subtitle: 'Input & rekap nilai', icon: <ClipboardList size={16} />, url: '/assessments', category: 'Akademik' },
    { id: 'santri', title: 'Semua Santri', subtitle: 'Daftar santri', icon: <GraduationCap size={16} />, url: '/students', category: 'Data' },
    { id: 'ptk', title: 'PTK & Tendik', subtitle: 'Data pegawai', icon: <Users size={16} />, url: '/employees', category: 'Data' },
    { id: 'laporan-santri', title: 'Laporan Santri', subtitle: 'Statistik & rekap', icon: <BarChart3 size={16} />, url: '/reports/students', category: 'Laporan' },
    { id: 'laporan-ptk', title: 'Laporan PTK', subtitle: 'Statistik pegawai', icon: <BarChart3 size={16} />, url: '/reports/employees', category: 'Laporan' },
    { id: 'import', title: 'Import Excel', subtitle: 'Import data massal', icon: <FileUp size={16} />, url: '/import', category: 'Tools' },
    { id: 'profil', title: 'Profil Madrasah', subtitle: 'Informasi lembaga', icon: <Settings size={16} />, url: '/school-profile', category: 'Pengaturan' },
  ];

  // Build search results
  const results: SearchResult[] = [];

  if (query.length >= 2) {
    // Students
    const studentList = students?.data || students || [];
    if (Array.isArray(studentList)) {
      studentList.forEach((s: any) => {
        results.push({
          id: `student-${s.id}`,
          title: s.fullName,
          subtitle: `${s.studentNumber} • ${s.classHistories?.[0]?.class?.level?.name || ''} ${s.classHistories?.[0]?.class?.name || ''}`.trim(),
          icon: <GraduationCap size={16} className="text-blue-500" />,
          url: `/students/${s.id}`,
          category: 'Santri',
        });
      });
    }

    // Employees
    const empList = employees?.data || employees || [];
    if (Array.isArray(empList)) {
      empList.forEach((e: any) => {
        results.push({
          id: `employee-${e.id}`,
          title: e.fullName,
          subtitle: `${e.employeeNumber} • ${e.employeeType === 'TEACHER' ? 'Guru' : 'Tendik'}`,
          icon: <Users size={16} className="text-green-500" />,
          url: `/employees/${e.id}`,
          category: 'PTK & Tendik',
        });
      });
    }
  }

  // Filter static pages by query
  const filteredPages = query.length >= 1
    ? staticPages.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const allResults = [...results, ...filteredPages];
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback((result: SearchResult) => {
    navigate(result.url);
    onOpenChange(false);
  }, [navigate, onOpenChange]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      handleSelect(allResults[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 bg-background rounded-xl border shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cari santri, guru, halaman..."
            className="flex-1 bg-transparent outline-none text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto p-2">
          {query.length < 2 && filteredPages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Search size={32} className="mx-auto mb-2 opacity-30" />
              <p>Ketik minimal 2 karakter untuk mencari</p>
              <p className="text-xs mt-1">Contoh: nama santri, nama guru, atau nama halaman</p>
            </div>
          )}

          {allResults.length === 0 && query.length >= 2 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>Tidak ada hasil untuk "<strong>{query}</strong>"</p>
            </div>
          )}

          {/* Group by category */}
          {allResults.length > 0 && (() => {
            const groups: Record<string, SearchResult[]> = {};
            allResults.forEach((r) => {
              if (!groups[r.category]) groups[r.category] = [];
              groups[r.category].push(r);
            });

            let flatIndex = 0;
            return Object.entries(groups).map(([category, items]) => (
              <div key={category} className="mb-1">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  {category}
                </p>
                {items.map((result) => {
                  const idx = flatIndex++;
                  return (
                    <button
                      key={result.id}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        idx === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span className="shrink-0">{result.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      <ArrowRight size={14} className="shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            ));
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1">↑↓</kbd> navigasi
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1">Enter</kbd> pilih
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1">ESC</kbd> tutup
          </span>
        </div>
      </div>
    </div>
  );
}
