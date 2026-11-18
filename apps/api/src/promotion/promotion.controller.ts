import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PromotionService } from './promotion.service';

@ApiTags('Promotion')
@ApiBearerAuth()
@Controller('promotion')
@RequirePermissions('promotion.read')
export class PromotionController {
  constructor(private promotionService: PromotionService) {}

  @Get('preview')
  @ApiOperation({ summary: 'Preview promotion plan for a class' })
  @ApiQuery({ name: 'fromAcademicYearId', required: true })
  @ApiQuery({ name: 'toAcademicYearId', required: true })
  @ApiQuery({ name: 'classId', required: true })
  async preview(
    @Query('fromAcademicYearId') fromAcademicYearId: string,
    @Query('toAcademicYearId') toAcademicYearId: string,
    @Query('classId') classId: string,
  ) {
    return this.promotionService.preview(
      fromAcademicYearId,
      toAcademicYearId,
      classId,
    );
  }

  @Post('rollover-classes')
  @RequirePermissions('promotion.manage')
  @ApiOperation({ summary: 'Copy class structure to the target academic year' })
  async rolloverClasses(
    @Body() body: { fromAcademicYearId: string; toAcademicYearId: string },
  ) {
    return this.promotionService.rolloverClasses(
      body.fromAcademicYearId,
      body.toAcademicYearId,
    );
  }

  @Post('execute')
  @RequirePermissions('promotion.manage')
  @ApiOperation({
    summary: 'Execute promotion (promote / repeat / graduate) for students',
  })
  async execute(
    @Body()
    body: {
      fromAcademicYearId: string;
      toAcademicYearId: string;
      items: { studentId: string; action: 'PROMOTE' | 'REPEAT' | 'GRADUATE'; targetClassId?: string }[];
    },
  ) {
    return this.promotionService.execute(
      body.fromAcademicYearId,
      body.toAcademicYearId,
      body.items,
    );
  }
}
