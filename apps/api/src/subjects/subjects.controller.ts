import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/create-subject.dto';

@ApiTags('Subjects')
@ApiBearerAuth()
@Controller('subjects')
@RequirePermissions('subjects.read')
export class SubjectsController {
  constructor(private subjectsService: SubjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all subjects' })
  @ApiQuery({ name: 'levelId', required: false })
  async findAll(@Query('levelId') levelId?: string) {
    return this.subjectsService.findAll(levelId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subject by ID' })
  async findOne(@Param('id') id: string) {
    return this.subjectsService.findOne(id);
  }

  @Post()
  @RequirePermissions('subjects.create')
  @ApiOperation({ summary: 'Create subject' })
  async create(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('subjects.update')
  @ApiOperation({ summary: 'Update subject' })
  async update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('subjects.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete subject (soft)' })
  async delete(@Param('id') id: string) {
    return this.subjectsService.delete(id);
  }
}
