import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './auth/permissions.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { UsersModule } from './users/users.module';
import { SchoolModule } from './school/school.module';
import { AcademicYearModule } from './academic-year/academic-year.module';
import { LevelsModule } from './levels/levels.module';
import { ClassesModule } from './classes/classes.module';
import { StudentsModule } from './students/students.module';
import { EmployeesModule } from './employees/employees.module';
import { SubjectsModule } from './subjects/subjects.module';
import { SchedulesModule } from './schedules/schedules.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ImportModule } from './import/import.module';
import { AuditModule } from './audit/audit.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { RolesModule } from './roles/roles.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PromotionModule } from './promotion/promotion.module';
import { PpdbModule } from './ppdb/ppdb.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    SchoolModule,
    AcademicYearModule,
    LevelsModule,
    ClassesModule,
    StudentsModule,
    EmployeesModule,
    SubjectsModule,
    SchedulesModule,
    DashboardModule,
    ImportModule,
    AuditModule,
    AttendanceModule,
    AssessmentsModule,
    RolesModule,
    ReportsModule,
    NotificationsModule,
    PromotionModule,
    PpdbModule,
  ],
  providers: [
    // Urutan penting: autentikasi dulu, baru penegakan permission.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Audit log global untuk semua operasi yang mengubah data.
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
