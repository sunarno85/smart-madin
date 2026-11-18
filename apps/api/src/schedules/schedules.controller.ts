import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/create-schedule.dto';

@ApiTags('Schedules')
@ApiBearerAuth()
@Controller('schedules')
@RequirePermissions('schedules.read')
export class SchedulesController {
  constructor(private schedulesService: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all schedules' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'dayOfWeek', required: false })
  @ApiQuery({ name: 'levelId', required: false })
  async findAll(
    @Query('academicYearId') academicYearId?: string,
    @Query('classId') classId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('dayOfWeek') dayOfWeek?: string,
    @Query('levelId') levelId?: string,
  ) {
    return this.schedulesService.findAll({
      academicYearId,
      classId,
      teacherId,
      dayOfWeek: dayOfWeek ? parseInt(dayOfWeek) : undefined,
      levelId,
    });
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Get weekly schedule for a class' })
  @ApiQuery({ name: 'classId', required: true })
  @ApiQuery({ name: 'academicYearId', required: true })
  async getWeeklySchedule(
    @Query('classId') classId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.schedulesService.getWeeklySchedule(classId, academicYearId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule by ID' })
  async findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(id);
  }

  @Post()
  @RequirePermissions('schedules.create')
  @ApiOperation({ summary: 'Create schedule' })
  async create(@Body() dto: CreateScheduleDto) {
    return this.schedulesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('schedules.update')
  @ApiOperation({ summary: 'Update schedule' })
  async update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.schedulesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('schedules.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete schedule' })
  async delete(@Param('id') id: string) {
    return this.schedulesService.delete(id);
  }
}
