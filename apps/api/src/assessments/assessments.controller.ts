import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { AssessmentsService } from './assessments.service';

@ApiTags('Assessments')
@ApiBearerAuth()
@Controller('assessments')
@RequirePermissions('assessments.read')
export class AssessmentsController {
  constructor(private assessmentsService: AssessmentsService) {}

  // ---- Stats (must be before :id routes) ----

  @Get('stats')
  @ApiOperation({ summary: 'Get assessment statistics' })
  async getStats(@Query('academicYearId') academicYearId?: string) {
    return this.assessmentsService.getStats(academicYearId);
  }

  // ---- Components ----

  @Get('components')
  @ApiOperation({ summary: 'Get assessment components' })
  async findComponents() {
    return this.assessmentsService.findComponents();
  }

  @Post('components')
  @RequirePermissions('assessments.create')
  @ApiOperation({ summary: 'Create assessment component' })
  async createComponent(@Body() body: {
    name: string; code: string; description?: string; weight?: number;
  }) {
    return this.assessmentsService.createComponent(body);
  }

  // ---- Assessments ----

  @Get()
  @ApiOperation({ summary: 'Get assessments list' })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'componentId', required: false })
  @ApiQuery({ name: 'semester', required: false, enum: ['SATU', 'DUA'] })
  async findAssessments(
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('componentId') componentId?: string,
    @Query('semester') semester?: string,
  ) {
    return this.assessmentsService.findAssessments({
      classId, subjectId, academicYearId, componentId, semester,
    });
  }

  @Post()
  @RequirePermissions('assessments.create')
  @ApiOperation({ summary: 'Create assessment' })
  async createAssessment(@Body() body: {
    classId: string;
    academicYearId: string;
    subjectId: string;
    componentId: string;
    title: string;
    description?: string;
    maxScore?: number;
    semester?: 'SATU' | 'DUA';
    date?: string;
  }) {
    return this.assessmentsService.createAssessment(body);
  }

  // ---- Recap (must be before :id routes) ----

  @Get('recap/:classId/:academicYearId')
  @ApiOperation({ summary: 'Get student grade recap for a class' })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiQuery({ name: 'semester', required: false, enum: ['SATU', 'DUA'] })
  async getStudentRecap(
    @Param('classId') classId: string,
    @Param('academicYearId') academicYearId: string,
    @Query('subjectId') subjectId?: string,
    @Query('semester') semester?: string,
  ) {
    return this.assessmentsService.getStudentRecap(classId, academicYearId, subjectId, semester);
  }

  @Get('gpa/:classId/:academicYearId')
  @ApiOperation({ summary: 'Get GPA calculator for a class' })
  @ApiQuery({ name: 'semester', required: false, enum: ['SATU', 'DUA'] })
  async getGPA(
    @Param('classId') classId: string,
    @Param('academicYearId') academicYearId: string,
    @Query('semester') semester?: string,
  ) {
    return this.assessmentsService.getGPACalculator(classId, academicYearId, semester);
  }

  // ---- Rubric Templates ----

  @Get('rubrics')
  @ApiOperation({ summary: 'Get all rubric templates' })
  async findRubricTemplates() {
    return this.assessmentsService.findRubricTemplates();
  }

  @Get('rubrics/:id')
  @ApiOperation({ summary: 'Get rubric template detail' })
  async findOneRubricTemplate(@Param('id') id: string) {
    return this.assessmentsService.findOneRubricTemplate(id);
  }

  @Post('rubrics')
  @RequirePermissions('assessments.create')
  @ApiOperation({ summary: 'Create rubric template' })
  async createRubricTemplate(@Body() body: any) {
    return this.assessmentsService.createRubricTemplate(body);
  }

  @Patch('rubrics/:id')
  @RequirePermissions('assessments.update')
  @ApiOperation({ summary: 'Update rubric template' })
  async updateRubricTemplate(@Param('id') id: string, @Body() body: any) {
    return this.assessmentsService.updateRubricTemplate(id, body);
  }

  @Delete('rubrics/:id')
  @RequirePermissions('assessments.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete rubric template' })
  async deleteRubricTemplate(@Param('id') id: string) {
    return this.assessmentsService.deleteRubricTemplate(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assessment detail with scores' })
  async findOneAssessment(@Param('id') id: string) {
    return this.assessmentsService.findOneAssessment(id);
  }

  @Delete(':id')
  @RequirePermissions('assessments.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete assessment' })
  async deleteAssessment(@Param('id') id: string) {
    return this.assessmentsService.deleteAssessment(id);
  }

  // ---- Scores ----

  @Patch(':assessmentId/scores/:studentId')
  @RequirePermissions('assessments.update')
  @ApiOperation({ summary: 'Update single score' })
  async updateScore(
    @Param('assessmentId') assessmentId: string,
    @Param('studentId') studentId: string,
    @Body() body: { score: number; notes?: string },
  ) {
    return this.assessmentsService.updateScore(assessmentId, studentId, body.score, body.notes);
  }

  @Post(':assessmentId/scores/bulk')
  @RequirePermissions('assessments.update')
  @ApiOperation({ summary: 'Bulk update scores' })
  async bulkUpdateScores(
    @Param('assessmentId') assessmentId: string,
    @Body() body: { scores: { studentId: string; score: number; notes?: string }[] },
  ) {
    return this.assessmentsService.bulkUpdateScores(assessmentId, body.scores);
  }
}
