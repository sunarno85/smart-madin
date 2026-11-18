import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { AttendanceService } from './attendance.service';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
@RequirePermissions('attendance.read')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  // ---- Sessions ----

  @Get('sessions')
  @ApiOperation({ summary: 'Get attendance sessions' })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'semester', required: false, enum: ['SATU', 'DUA'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async findSessions(
    @Query('classId') classId?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('date') date?: string,
    @Query('semester') semester?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.attendanceService.findSessions({
      classId, academicYearId, date, semester,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
    });
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get session detail with records' })
  async findOneSession(@Param('id') id: string) {
    return this.attendanceService.findOneSession(id);
  }

  @Post('sessions')
  @RequirePermissions('attendance.create')
  @ApiOperation({ summary: 'Create attendance session' })
  async createSession(@Body() body: {
    classId: string;
    academicYearId: string;
    date: string;
    teacherId: string;
    subjectId: string;
    semester?: 'SATU' | 'DUA';
    notes?: string;
  }) {
    return this.attendanceService.createSession(body);
  }

  @Delete('sessions/:id')
  @RequirePermissions('attendance.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete attendance session' })
  async deleteSession(@Param('id') id: string) {
    return this.attendanceService.deleteSession(id);
  }

  // ---- Records ----

  @Patch('sessions/:sessionId/records/:studentId')
  @RequirePermissions('attendance.update')
  @ApiOperation({ summary: 'Update single attendance record' })
  async updateRecord(
    @Param('sessionId') sessionId: string,
    @Param('studentId') studentId: string,
    @Body() body: { status: 'PRESENT' | 'SICK' | 'PERMISSION' | 'ABSENT'; notes?: string },
  ) {
    return this.attendanceService.updateRecord(sessionId, studentId, body.status, body.notes);
  }

  @Post('sessions/:sessionId/records/bulk')
  @RequirePermissions('attendance.update')
  @ApiOperation({ summary: 'Bulk update attendance records' })
  async bulkUpdateRecords(
    @Param('sessionId') sessionId: string,
    @Body() body: { records: { studentId: string; status: 'PRESENT' | 'SICK' | 'PERMISSION' | 'ABSENT'; notes?: string }[] },
  ) {
    return this.attendanceService.bulkUpdateRecords(sessionId, body.records);
  }

  // ---- Stats ----

  @Get('stats')
  @ApiOperation({ summary: 'Get attendance statistics' })
  async getStats(@Query('academicYearId') academicYearId?: string) {
    return this.attendanceService.getStats(academicYearId);
  }

  @Get('students/:studentId')
  @ApiOperation({ summary: 'Get student attendance history' })
  async getStudentAttendance(
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.attendanceService.getStudentAttendance(studentId, academicYearId);
  }
}
