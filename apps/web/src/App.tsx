import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'sonner';
import { MainLayout } from './layouts/MainLayout';

// Halaman dimuat sesuai kebutuhan agar bundel awal tetap kecil.
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const PendaftaranPage = lazy(() =>
  import('./pages/PendaftaranPage').then((m) => ({ default: m.PendaftaranPage })),
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const StudentsPage = lazy(() =>
  import('./pages/StudentsPage').then((m) => ({ default: m.StudentsPage })),
);
const StudentDetailPage = lazy(() =>
  import('./pages/StudentDetailPage').then((m) => ({ default: m.StudentDetailPage })),
);
const EmployeesPage = lazy(() =>
  import('./pages/EmployeesPage').then((m) => ({ default: m.EmployeesPage })),
);
const EmployeeDetailPage = lazy(() =>
  import('./pages/EmployeeDetailPage').then((m) => ({ default: m.EmployeeDetailPage })),
);
const ClassesPage = lazy(() =>
  import('./pages/ClassesPage').then((m) => ({ default: m.ClassesPage })),
);
const LevelsPage = lazy(() =>
  import('./pages/LevelsPage').then((m) => ({ default: m.LevelsPage })),
);
const SubjectsPage = lazy(() =>
  import('./pages/SubjectsPage').then((m) => ({ default: m.SubjectsPage })),
);
const AcademicYearsPage = lazy(() =>
  import('./pages/AcademicYearsPage').then((m) => ({ default: m.AcademicYearsPage })),
);
const SchoolProfilePage = lazy(() =>
  import('./pages/SchoolProfilePage').then((m) => ({ default: m.SchoolProfilePage })),
);
const SchedulesPage = lazy(() =>
  import('./pages/SchedulesPage').then((m) => ({ default: m.SchedulesPage })),
);
const UsersPage = lazy(() =>
  import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const AuditLogPage = lazy(() =>
  import('./pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage })),
);
const ImportPage = lazy(() =>
  import('./pages/ImportPage').then((m) => ({ default: m.ImportPage })),
);
const AttendancePage = lazy(() =>
  import('./pages/AttendancePage').then((m) => ({ default: m.AttendancePage })),
);
const AssessmentsPage = lazy(() =>
  import('./pages/AssessmentsPage').then((m) => ({ default: m.AssessmentsPage })),
);
const RolesPage = lazy(() =>
  import('./pages/RolesPage').then((m) => ({ default: m.RolesPage })),
);
const LaporanSantriPage = lazy(() =>
  import('./pages/LaporanSantriPage').then((m) => ({ default: m.LaporanSantriPage })),
);
const LaporanPTKPage = lazy(() =>
  import('./pages/LaporanPTKPage').then((m) => ({ default: m.LaporanPTKPage })),
);
const NotificationsPage = lazy(() =>
  import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const KenaikanKelasPage = lazy(() =>
  import('./pages/KenaikanKelasPage').then((m) => ({ default: m.KenaikanKelasPage })),
);
const RaporPage = lazy(() =>
  import('./pages/RaporPage').then((m) => ({ default: m.RaporPage })),
);
const LegerPage = lazy(() =>
  import('./pages/LegerPage').then((m) => ({ default: m.LegerPage })),
);
const PpdbPage = lazy(() =>
  import('./pages/PpdbPage').then((m) => ({ default: m.PpdbPage })),
);
const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })),
);

function FullPageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

/**
 * Penjaga rute berbasis permission. API tetap menjadi sumber kebenaran
 * (guard di server), ini hanya mencegah tampilan halaman yang tidak berhak.
 */
function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(permission)) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <Toaster position="top-right" richColors closeButton />
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pendaftaran" element={<PendaftaranPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Suspense fallback={<FullPageLoader />}>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route
                        path="/school-profile"
                        element={
                          <RequirePermission permission="settings.read">
                            <SchoolProfilePage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/academic-years"
                        element={
                          <RequirePermission permission="academic_years.read">
                            <AcademicYearsPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/levels"
                        element={
                          <RequirePermission permission="levels.read">
                            <LevelsPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/classes"
                        element={
                          <RequirePermission permission="classes.read">
                            <ClassesPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/subjects"
                        element={
                          <RequirePermission permission="subjects.read">
                            <SubjectsPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/students"
                        element={
                          <RequirePermission permission="students.read">
                            <StudentsPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/students/:id"
                        element={
                          <RequirePermission permission="students.read">
                            <StudentDetailPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/ppdb"
                        element={
                          <RequirePermission permission="ppdb.read">
                            <PpdbPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/employees"
                        element={
                          <RequirePermission permission="employees.read">
                            <EmployeesPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/employees/:id"
                        element={
                          <RequirePermission permission="employees.read">
                            <EmployeeDetailPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/schedules"
                        element={
                          <RequirePermission permission="schedules.read">
                            <SchedulesPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/imports"
                        element={
                          <RequirePermission permission="imports.read">
                            <ImportPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/attendance"
                        element={
                          <RequirePermission permission="attendance.read">
                            <AttendancePage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/assessments"
                        element={
                          <RequirePermission permission="assessments.read">
                            <AssessmentsPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/promotion"
                        element={
                          <RequirePermission permission="promotion.read">
                            <KenaikanKelasPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/users"
                        element={
                          <RequirePermission permission="users.read">
                            <UsersPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/reports/students"
                        element={
                          <RequirePermission permission="reports.read">
                            <LaporanSantriPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/reports/employees"
                        element={
                          <RequirePermission permission="reports.read">
                            <LaporanPTKPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/reports/rapor"
                        element={
                          <RequirePermission permission="reports.read">
                            <RaporPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/reports/leger"
                        element={
                          <RequirePermission permission="reports.read">
                            <LegerPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/roles"
                        element={
                          <RequirePermission permission="roles.read">
                            <RolesPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/audit-log"
                        element={
                          <RequirePermission permission="audit.read">
                            <AuditLogPage />
                          </RequirePermission>
                        }
                      />
                      <Route
                        path="/notifications"
                        element={
                          <RequirePermission permission="notifications.read">
                            <NotificationsPage />
                          </RequirePermission>
                        }
                      />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Suspense>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
}
