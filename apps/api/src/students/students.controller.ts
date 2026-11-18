import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
@RequirePermissions('students.read')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all students' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'levelId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'gender', required: false })
  @ApiQuery({ name: 'academicYearId', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('levelId') levelId?: string,
    @Query('classId') classId?: string,
    @Query('gender') gender?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.studentsService.findAll({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      search,
      status,
      levelId,
      classId,
      gender,
      academicYearId,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get student statistics' })
  async getStats() {
    return this.studentsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  async findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Post()
  @RequirePermissions('students.create')
  @ApiOperation({ summary: 'Create student' })
  async create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('students.update')
  @ApiOperation({ summary: 'Update student' })
  async update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('students.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete student' })
  async delete(@Param('id') id: string) {
    return this.studentsService.softDelete(id);
  }

  @Patch(':id/restore')
  @RequirePermissions('students.update')
  @ApiOperation({ summary: 'Restore deleted student' })
  async restore(@Param('id') id: string) {
    return this.studentsService.restore(id);
  }

  @Post(':id/assign-class')
  @RequirePermissions('students.update')
  @ApiOperation({ summary: 'Assign student to class' })
  async assignClass(
    @Param('id') id: string,
    @Body() body: { classId: string; academicYearId: string },
  ) {
    return this.studentsService.assignClass(id, body.classId, body.academicYearId);
  }

  @Patch(':id/photo')
  @RequirePermissions('students.update')
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        cb(new Error('Hanya file gambar yang diizinkan'), false);
      } else {
        cb(null, true);
      }
    },
    limits: { fileSize: 2 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload student photo' })
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.studentsService.updatePhoto(id, file.filename);
  }
}
