import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SearchDialog } from '../components/SearchDialog';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar,
  ClipboardList, FileText, Settings, Shield, LogOut, Menu, X,
  School, ChevronDown, ChevronRight, Search, Bell,
  UserCheck, ClipboardCheck, BarChart3, FileUp,
  User, LogOut as LogOutIcon, ChevronLeft,
  Sun, Moon, Monitor, TrendingUp, UserPlus, Info,
} from 'lucide-react';

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  permission?: string; // e.g. 'students.read'
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
  { label: 'Tentang Aplikasi', icon: <Info size={20} />, path: '/about' },
  {
    label: 'Master Data', icon: <School size={20} />,
    permission: 'settings.read',
    children: [
      { label: 'Profil Madrasah', icon: <School size={18} />, path: '/school-profile', permission: 'settings.read' },
      { label: 'Tahun Ajaran', icon: <Calendar size={18} />, path: '/academic-years', permission: 'academic_years.read' },
      { label: 'Jenjang', icon: <BarChart3 size={18} />, path: '/levels', permission: 'levels.read' },
      { label: 'Kelas', icon: <Users size={18} />, path: '/classes', permission: 'classes.read' },
      { label: 'Mata Pelajaran', icon: <BookOpen size={18} />, path: '/subjects', permission: 'subjects.read' },
    ],
  },
  {
    label: 'Data Personel', icon: <UserCheck size={20} />,
    permission: 'employees.read',
    children: [
      { label: 'PTK & Tendik', icon: <UserCheck size={18} />, path: '/employees', permission: 'employees.read' },
    ],
  },
  {
    label: 'Santri', icon: <GraduationCap size={20} />,
    permission: 'students.read',
    children: [
      { label: 'Semua Santri', icon: <GraduationCap size={18} />, path: '/students', permission: 'students.read' },
      { label: 'PPDB Santri Baru', icon: <UserPlus size={18} />, path: '/ppdb', permission: 'ppdb.read' },
    ],
  },
  {
    label: 'Akademik', icon: <ClipboardList size={20} />,
    permission: 'schedules.read',
    children: [
      { label: 'Jadwal', icon: <Calendar size={18} />, path: '/schedules', permission: 'schedules.read' },
      { label: 'Presensi', icon: <ClipboardCheck size={18} />, path: '/attendance', permission: 'attendance.read' },
      { label: 'Penilaian', icon: <BarChart3 size={18} />, path: '/assessments', permission: 'assessments.read' },
      { label: 'Kenaikan Kelas', icon: <TrendingUp size={18} />, path: '/promotion', permission: 'promotion.read' },
      { label: 'Import Excel', icon: <FileUp size={18} />, path: '/imports', permission: 'imports.read' },
    ],
  },
  {
    label: 'Laporan', icon: <FileText size={20} />,
    permission: 'reports.read',
    children: [
      { label: 'Laporan Santri', icon: <FileText size={18} />, path: '/reports/students', permission: 'reports.read' },
      { label: 'Laporan PTK', icon: <FileText size={18} />, path: '/reports/employees', permission: 'reports.read' },
      { label: 'Rapor Santri', icon: <FileText size={18} />, path: '/reports/rapor', permission: 'reports.read' },
      { label: 'Leger Nilai', icon: <FileText size={18} />, path: '/reports/leger', permission: 'reports.read' },
    ],
  },
  {
    label: 'Sistem', icon: <Settings size={20} />,
    permission: 'users.read',
    children: [
      { label: 'Pengguna', icon: <Shield size={18} />, path: '/users', permission: 'users.read' },
      { label: 'Role & Permission', icon: <Shield size={18} />, path: '/roles', permission: 'roles.read' },
      { label: 'Audit Log', icon: <ClipboardCheck size={18} />, path: '/audit-log', permission: 'audit.read' },
      { label: 'Notifikasi', icon: <Bell size={18} />, path: '/notifications', permission: 'notifications.read' },
    ],
  },
];

function SidebarContent({
  collapsed,
  expandedItems,
  toggleExpand,
  onNavigate,
}: {
  collapsed?: boolean;
  expandedItems: Record<string, boolean>;
  toggleExpand: (label: string) => void;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();

  // Filter menu items by user permissions
  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.permission) return true;
    if (hasPermission(item.permission)) return true;
    // Check if any child permission is granted
    if (item.children) {
      return item.children.some((child) => child.permission && hasPermission(child.permission));
    }
    return false;
  }).map((item) => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter((child) => !child.permission || hasPermission(child.permission)),
      };
    }
    return item;
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    onNavigate?.();
  };

  return (
    <>
      <nav className={`flex-1 overflow-y-auto space-y-1 ${collapsed ? 'px-2 py-3' : 'p-3'}`}>
        {filteredMenuItems.map((item) => {
          if (item.children) {
            const hasActiveChild = item.children.some(
              (child) => child.path && location.pathname === child.path,
            );
            const isExpanded = expandedItems[item.label] ?? false;

            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleExpand(item.label)}
                  title={collapsed ? item.label : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent ${
                    hasActiveChild ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </>
                  )}
                </button>
                {isExpanded && !collapsed && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path!}
                        onClick={onNavigate}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent ${
                          location.pathname === child.path
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path!}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent ${
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
            {user?.fullName?.charAt(0) || 'A'}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.roles?.[0]?.replace(/_/g, ' ')}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    'Master Data': true,
    'Data Personel': true,
    'Santri': true,
    'Akademik': true,
    'Laporan': false,
    'Sistem': false,
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    await useAuth().logout();
    navigate('/login');
  };

  const userInitial = user?.fullName?.charAt(0) || 'A';
  const userRole = user?.roles?.[0]?.replace(/_/g, ' ') || 'User';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ─── Desktop Sidebar ─── */}
      <aside
        className="hidden md:flex flex-col shrink-0 inset-y-0 left-0 z-50 border-r bg-background overflow-hidden"
        style={{ width: collapsed ? 64 : 256 }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between border-b shrink-0" style={{ height: 64, padding: collapsed ? '0 8px' : '0 16px' }}>
          {collapsed ? (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              SM
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">SM</div>
                <span className="font-bold text-primary">SMART MADIN</span>
              </div>
              <button onClick={() => setCollapsed(true)} className="rounded-lg p-2 hover:bg-accent" title="Collapse sidebar">
                <ChevronLeft size={20} />
              </button>
            </>
          )}
        </div>
        {collapsed && (
          <div className="flex justify-center py-2 border-b shrink-0">
            <button onClick={() => setCollapsed(false)} className="rounded-lg p-2 hover:bg-accent" title="Expand sidebar">
              <Menu size={20} />
            </button>
          </div>
        )}
        <SidebarContent collapsed={collapsed} expandedItems={expandedItems} toggleExpand={toggleExpand} />
      </aside>

      {/* ─── Mobile Overlay ─── */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ─── Mobile Sidebar ─── */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-background transition-transform duration-300 md:hidden ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">SM</div>
            <span className="font-bold text-primary">SMART MADIN</span>
          </div>
          <button onClick={() => setMobileSidebarOpen(false)} className="rounded-lg p-2 hover:bg-accent"><X size={20} /></button>
        </div>
        <SidebarContent expandedItems={expandedItems} toggleExpand={toggleExpand} onNavigate={() => setMobileSidebarOpen(false)} />
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="shrink-0 sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileSidebarOpen(true)} className="rounded-lg p-2 hover:bg-accent md:hidden" aria-label="Open menu">
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold truncate">SMART MADIN</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <Search size={16} />
              <span className="hidden lg:inline">Cari...</span>
              <kbd className="hidden lg:inline-flex h-5 items-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">Ctrl+K</kbd>
            </button>
            <button className="relative rounded-lg p-2 hover:bg-accent">
              <Bell size={20} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            </button>
            {/* Dark mode toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="rounded-lg p-2 hover:bg-accent transition-colors"
              title={resolvedTheme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            >
              {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">{userInitial}</div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium leading-none">{user?.fullName || 'User'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{userRole}</p>
                </div>
                <ChevronDown size={16} className={`hidden sm:block text-muted-foreground transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-background shadow-lg py-1 z-50">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium">{user?.fullName || 'User'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{user?.email || ''}</p>
                    <div className="mt-2">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{userRole}</span>
                    </div>
                  </div>
                  <div className="py-1">
                    <Link to="/about" onClick={() => setProfileDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                      <Info size={16} />
                      Tentang Aplikasi
                    </Link>
                    <Link to="/school-profile" onClick={() => setProfileDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                      <User size={16} />
                      Profil Madrasah
                    </Link>
                  </div>
                  <div className="border-t py-1">
                    <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                      <LogOutIcon size={16} />
                      Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </main>
      {/* ── Search Dialog ── */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
