import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@RequirePermissions('dashboard.read')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview' })
  async getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('students-by-level')
  @ApiOperation({ summary: 'Get student count by level' })
  async getStudentByLevel() {
    return this.dashboardService.getStudentByLevel();
  }

  @Get('students-by-class')
  @ApiOperation({ summary: 'Get student count by class' })
  async getStudentByClass() {
    return this.dashboardService.getStudentByClass();
  }

  @Get('today-schedule')
  @ApiOperation({ summary: 'Get today schedule' })
  @ApiQuery({ name: 'classId', required: false })
  async getTodaySchedule(@Query('classId') classId?: string) {
    return this.dashboardService.getTodaySchedule(classId);
  }

  @Get('monthly-trends')
  @ApiOperation({ summary: 'Get monthly enrollment trends' })
  async getMonthlyTrends() {
    return this.dashboardService.getMonthlyTrends();
  }

  @Get('attendance-heatmap')
  @ApiOperation({ summary: 'Get attendance heatmap by day' })
  async getAttendanceHeatmap() {
    return this.dashboardService.getAttendanceHeatmap();
  }

  @Get('grade-distribution')
  @ApiOperation({ summary: 'Get grade distribution histogram' })
  async getGradeDistribution() {
    return this.dashboardService.getGradeDistribution();
  }
}
