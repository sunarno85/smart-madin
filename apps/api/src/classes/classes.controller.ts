import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { ClassesService } from './classes.service';
import { CreateClassDto, UpdateClassDto } from './dto/create-class.dto';

@ApiTags('Classes')
@ApiBearerAuth()
@Controller('classes')
@RequirePermissions('classes.read')
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all classes' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'levelId', required: false })
  async findAll(
    @Query('academicYearId') academicYearId?: string,
    @Query('levelId') levelId?: string,
  ) {
    return this.classesService.findAll(academicYearId, levelId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get class by ID' })
  async findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Post()
  @RequirePermissions('classes.create')
  @ApiOperation({ summary: 'Create class' })
  async create(@Body() dto: CreateClassDto) {
    return this.classesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('classes.update')
  @ApiOperation({ summary: 'Update class' })
  async update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.classesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('classes.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete class' })
  async delete(@Param('id') id: string) {
    return this.classesService.delete(id);
  }
}
