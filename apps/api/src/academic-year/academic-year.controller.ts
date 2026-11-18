import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { AcademicYearService } from './academic-year.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';

@ApiTags('Academic Years')
@ApiBearerAuth()
@Controller('academic-years')
@RequirePermissions('academic_years.read')
export class AcademicYearController {
  constructor(private academicYearService: AcademicYearService) {}

  @Get()
  @ApiOperation({ summary: 'Get all academic years' })
  async findAll() {
    return this.academicYearService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active academic year' })
  async findActive() {
    return this.academicYearService.findActive();
  }

  @Post()
  @RequirePermissions('academic_years.create')
  @ApiOperation({ summary: 'Create academic year' })
  async create(@Body() dto: CreateAcademicYearDto) {
    return this.academicYearService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('academic_years.update')
  @ApiOperation({ summary: 'Update academic year' })
  async update(@Param('id') id: string, @Body() dto: UpdateAcademicYearDto) {
    return this.academicYearService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('academic_years.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete academic year' })
  async delete(@Param('id') id: string) {
    return this.academicYearService.delete(id);
  }

  @Patch(':id/activate')
  @RequirePermissions('academic_years.manage')
  @ApiOperation({ summary: 'Activate academic year' })
  async activate(@Param('id') id: string) {
    return this.academicYearService.activate(id);
  }
}
