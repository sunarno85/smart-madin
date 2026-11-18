import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Users, GraduationCap, UserCheck, BookOpen, Calendar,
  TrendingUp, Activity, ArrowUpRight, ArrowDownRight, BarChart3,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, AreaChart, Area,
} from 'recharts';

const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export function DashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => api.get('/dashboard/overview').then((r) => r.data),
  });

  const { data: studentByLevel = [] } = useQuery({
    queryKey: ['dashboard', 'students-by-level'],
    queryFn: () => api.get('/dashboard/students-by-level').then((r) => r.data),
  });

  const { data: studentByClass = [] } = useQuery({
    queryKey: ['dashboard', 'students-by-class'],
    queryFn: () => api.get('/dashboard/students-by-class').then((r) => r.data),
  });

  const { data: monthlyTrends = [] } = useQuery({
    queryKey: ['dashboard', 'monthly-trends'],
    queryFn: () => api.get('/dashboard/monthly-trends').then((r) => r.data),
  });

  const { data: heatmapData } = useQuery({
    queryKey: ['dashboard', 'attendance-heatmap'],
    queryFn: () => api.get('/dashboard/attendance-heatmap').then((r) => r.data),
  });

  const { data: gradeData } = useQuery({
    queryKey: ['dashboard', 'grade-distribution'],
    queryFn: () => api.get('/dashboard/grade-distribution').then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="mt-2 h-8 w-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = overview?.stats;
  const genderData = [
    { name: 'Laki-laki', value: stats?.maleStudents || 0 },
    { name: 'Perempuan', value: stats?.femaleStudents || 0 },
  ];

  // Only show last 6 months of trends (avoid flat zero months)
  const recentTrends = monthlyTrends.filter((m: any) => m.enrollment > 0);
  const trendsToShow = recentTrends.length > 0
    ? monthlyTrends.slice(Math.max(0, monthlyTrends.indexOf(recentTrends[0]) - 2))
    : monthlyTrends.slice(-6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {overview?.academicYear?.name
            ? `Tahun Ajaran ${overview.academicYear.name}`
            : 'Tidak ada tahun ajaran aktif'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Santri</p>
                <p className="text-2xl font-bold">{stats?.totalStudents || 0}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GraduationCap size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Santri Aktif</p>
                <p className="text-2xl font-bold">{stats?.activeStudents || 0}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <TrendingUp size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Guru</p>
                <p className="text-2xl font-bold">{stats?.totalTeachers || 0}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <UserCheck size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Kelas Aktif</p>
                <p className="text-2xl font-bold">{stats?.activeClasses || 0}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <BookOpen size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <ArrowUpRight className="text-green-600" size={20} />
              <div>
                <p className="text-sm text-muted-foreground">Laki-laki</p>
                <p className="text-lg font-semibold">{stats?.maleStudents || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <ArrowDownRight className="text-pink-600" size={20} />
              <div>
                <p className="text-sm text-muted-foreground">Perempuan</p>
                <p className="text-lg font-semibold">{stats?.femaleStudents || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <UserCheck className="text-blue-600" size={20} />
              <div>
                <p className="text-sm text-muted-foreground">Tendik</p>
                <p className="text-lg font-semibold">{stats?.totalStaff || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="text-indigo-600" size={20} />
              <div>
                <p className="text-sm text-muted-foreground">Santri Baru</p>
                <p className="text-lg font-semibold">{stats?.newStudents || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Level + Gender */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Santri per Jenjang</CardTitle>
          </CardHeader>
          <CardContent>
            {studentByLevel.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={studentByLevel}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="level" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Belum ada data
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribusi Gender</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {genderData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Monthly Trends + Attendance Heatmap */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Enrollment Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tren Pendaftaran Bulanan</CardTitle>
          </CardHeader>
          <CardContent>
            {trendsToShow.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendsToShow}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={11} angle={-30} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="enrollment" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Pendaftaran" />
                  <Area type="monotone" dataKey="active" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Aktif" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Belum ada data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Heatmap */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Kehadiran per Hari</CardTitle>
              {heatmapData?.summary && (
                <Badge variant="secondary">{heatmapData.summary.overallRate}% rate</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {heatmapData?.data?.length > 0 ? (
              <div className="space-y-3">
                {heatmapData.data.map((d: any) => {
                  const rate = d.rate;
                  const barColor = rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500';
                  return (
                    <div key={d.day} className="flex items-center gap-3">
                      <span className="w-16 text-sm font-medium shrink-0">{d.day}</span>
                      <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
                        <div
                          className={`h-full ${barColor} rounded-md transition-all`}
                          style={{ width: `${rate}%`, minWidth: rate > 0 ? '24px' : '0' }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                          {d.present}/{d.total} ({rate}%)
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right shrink-0">{d.sessions} sesi</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Belum ada data presensi
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3: Grade Distribution + Student by Class */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Distribusi Nilai</CardTitle>
              {gradeData?.summary && (
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>Rata-rata: <strong>{gradeData.summary.average}</strong></span>
                  <span>|</span>
                  <span>Min: <strong>{gradeData.summary.min}</strong></span>
                  <span>|</span>
                  <span>Max: <strong>{gradeData.summary.max}</strong></span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {gradeData?.distribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gradeData.distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" fontSize={12} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {gradeData.distribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Belum ada data penilaian
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student by Class */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Santri per Kelas</CardTitle>
          </CardHeader>
          <CardContent>
            {studentByClass.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={studentByClass}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="class" fontSize={11} angle={-30} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Belum ada data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aktivitas Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {overview?.recentActivities?.length > 0 ? (
            <div className="space-y-3">
              {overview.recentActivities.map((activity: any) => (
                <div key={activity.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Activity size={16} className="text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              Belum ada aktivitas
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
