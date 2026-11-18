import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PpdbService } from './ppdb.service';

@ApiTags('PPDB')
@ApiBearerAuth()
@Controller('ppdb')
export class PpdbController {
  constructor(private ppdbService: PpdbService) {}

  // ---- Public endpoints (no auth) ----

  @Public()
  @Get('public/years')
  @ApiOperation({ summary: 'List academic years with open PPDB registration' })
  async findOpenYears() {
    return this.ppdbService.findOpenYears();
  }

  @Public()
  @Post('public/register')
  @ApiOperation({ summary: 'Public PPDB registration (no login required)' })
  async register(
    @Body()
    body: {
      targetYearId: string;
      fullName: string;
      gender: 'MALE' | 'FEMALE';
      nik?: string;
      nisn?: string;
      birthPlace?: string;
      birthDate?: string;
      address?: string;
      previousSchool?: string;
      fatherName?: string;
      motherName?: string;
      parentPhone?: string;
    },
  ) {
    return this.ppdbService.register(body);
  }

  @Public()
  @Get('public/status')
  @ApiOperation({ summary: 'Check registration status by registration number' })
  @ApiQuery({ name: 'registrationNumber', required: true })
  async checkStatus(@Query('registrationNumber') registrationNumber: string) {
    return this.ppdbService.publicCheckStatus(registrationNumber);
  }

  // ---- Admin endpoints ----

  @RequirePermissions('ppdb.read')
  @Get('registrations')
  @ApiOperation({ summary: 'List PPDB registrations' })
  @ApiQuery({ name: 'targetYearId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async findRegistrations(
    @Query('targetYearId') targetYearId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ppdbService.findRegistrations({
      targetYearId,
      status,
      search,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
    });
  }

  @RequirePermissions('ppdb.read')
  @Get('registrations/:id')
  @ApiOperation({ summary: 'Get registration detail' })
  async findOne(@Param('id') id: string) {
    return this.ppdbService.findOneRegistration(id);
  }

  @RequirePermissions('ppdb.read')
  @Get('stats')
  @ApiOperation({ summary: 'PPDB statistics per status' })
  @ApiQuery({ name: 'targetYearId', required: false })
  async getStats(@Query('targetYearId') targetYearId?: string) {
    return this.ppdbService.getStats(targetYearId);
  }

  @RequirePermissions('ppdb.update')
  @Patch('registrations/:id/status')
  @ApiOperation({ summary: 'Update registration status (verify / accept / reject / waitlist)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    return this.ppdbService.updateStatus(id, body.status, body.notes);
  }

  @RequirePermissions('ppdb.update')
  @Post('registrations/:id/enroll')
  @ApiOperation({ summary: 'Convert an accepted registration into a student' })
  async enroll(@Param('id') id: string) {
    return this.ppdbService.enroll(id);
  }
}
