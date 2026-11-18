import {
  Controller, Get, Post, Body, Param, Query, Req,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody,
} from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { ImportService } from './import.service';
import { ExecuteImportDto } from './dto/import.dto';

@ApiTags('Import')
@ApiBearerAuth()
@Controller('imports')
@RequirePermissions('imports.read')
export class ImportController {
  constructor(private importService: ImportService) {}

  @Post('upload')
  @RequirePermissions('imports.create')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload Excel file and parse workbook' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.importService.parseWorkbook(file);
  }

  @Post('auto-map')
  @RequirePermissions('imports.create')
  @ApiOperation({ summary: 'Auto-detect column mapping' })
  async autoMapColumns(
    @Body() body: { headers: string[]; module: string },
  ) {
    return this.importService.autoMapColumns(body.headers, body.module);
  }

  @Post('create-job')
  @RequirePermissions('imports.create')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Create import job and get preview' })
  @ApiConsumes('multipart/form-data')
  async createJob(
    @UploadedFile() file: Express.Multer.File,
    @Body('sheetName') sheetName: string,
    @Body('module') module: string,
    @Req() req: any,
  ) {
    return this.importService.createImportJob(file, sheetName, module, req.user.sub);
  }

  @Post('preview')
  @RequirePermissions('imports.create')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Preview data with mapping applied' })
  @ApiConsumes('multipart/form-data')
  async previewData(
    @UploadedFile() file: Express.Multer.File,
    @Body('sheetName') sheetName: string,
    @Body('module') module: string,
    @Body('columnMapping') columnMapping: string,
    @Body('page') page: string,
    @Body('pageSize') pageSize: string,
  ) {
    return this.importService.previewData(
      file,
      sheetName,
      module,
      JSON.parse(columnMapping || '{}'),
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 10,
    );
  }

  @Post('detect-duplicates')
  @RequirePermissions('imports.create')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Detect duplicates in file and database' })
  @ApiConsumes('multipart/form-data')
  async detectDuplicates(
    @UploadedFile() file: Express.Multer.File,
    @Body('sheetName') sheetName: string,
    @Body('module') module: string,
    @Body('columnMapping') columnMapping: string,
  ) {
    return this.importService.detectDuplicates(
      file,
      sheetName,
      module,
      JSON.parse(columnMapping || '{}'),
    );
  }

  @Post('execute')
  @RequirePermissions('imports.create')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Execute import' })
  @ApiConsumes('multipart/form-data')
  async executeImport(
    @UploadedFile() file: Express.Multer.File,
    @Body('sheetName') sheetName: string,
    @Body('module') module: string,
    @Body('columnMapping') columnMapping: string,
    @Body('mode') mode: 'SKIP' | 'INSERT' | 'UPDATE',
    @Body('academicYearId') academicYearId: string,
    @Req() req: any,
  ) {
    return this.importService.executeImport(
      file,
      sheetName,
      module,
      JSON.parse(columnMapping || '{}'),
      mode || 'SKIP',
      req.user.sub,
      academicYearId,
    );
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get import jobs' })
  @ApiQuery({ name: 'module', required: false })
  async getJobs(@Query('module') module?: string) {
    return this.importService.getImportJobs(module);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get import job details' })
  async getJob(@Param('id') id: string) {
    return this.importService.getImportJob(id);
  }
}
