import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@RequirePermissions('reports.read')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('students/stats')
  @ApiOperation({ summary: 'Get student statistics report' })
  @ApiQuery({ name: 'academicYearId', required: false })
  async getStudentStats(@Query('academicYearId') academicYearId?: string) {
    return this.reportsService.getStudentStats(academicYearId);
  }

  @Get('attendance/recap')
  @ApiOperation({ summary: 'Get attendance recap report' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getAttendanceRecap(
    @Query('academicYearId') academicYearId?: string,
    @Query('classId') classId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getAttendanceRecap({ academicYearId, classId, startDate, endDate });
  }

  @Get('grades/recap')
  @ApiOperation({ summary: 'Get grade recap report' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'subjectId', required: false })
  async getGradeRecap(
    @Query('academicYearId') academicYearId?: string,
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.reportsService.getGradeRecap({ academicYearId, classId, subjectId });
  }

  @Get('employees/stats')
  @ApiOperation({ summary: 'Get employee statistics report' })
  async getEmployeeStats() {
    return this.reportsService.getEmployeeStats();
  }

  // ---- Rapor (report card) ----

  @Get('rapor/:studentId')
  @ApiOperation({ summary: 'Get student report card for a semester' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'semester', required: false, enum: ['SATU', 'DUA'] })
  async getRapor(
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('semester') semester?: string,
  ) {
    return this.reportsService.getRapor(studentId, academicYearId, semester);
  }

  // ---- Leger (grades matrix) ----

  @Get('leger/export')
  @ApiOperation({ summary: 'Export class grades ledger as Excel' })
  @ApiQuery({ name: 'classId', required: true })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'semester', required: false, enum: ['SATU', 'DUA'] })
  async exportLeger(
    @Res({ passthrough: true }) res: Response,
    @Query('classId') classId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('semester') semester?: string,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.reportsService.exportLegerExcel(
      classId,
      academicYearId,
      semester,
    );
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get('leger')
  @ApiOperation({ summary: 'Get class grades ledger for a semester' })
  @ApiQuery({ name: 'classId', required: true })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'semester', required: false, enum: ['SATU', 'DUA'] })
  async getLeger(
    @Query('classId') classId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('semester') semester?: string,
  ) {
    return this.reportsService.getLeger(classId, academicYearId, semester);
  }
}
