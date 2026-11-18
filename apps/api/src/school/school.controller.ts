import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { AuthenticatedOnly } from '../common/decorators/authenticated.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SchoolService } from './school.service';
import { UpdateSchoolDto } from './dto/update-school.dto';

@ApiTags('School Profile')
@ApiBearerAuth()
@Controller('school')
export class SchoolController {
  constructor(private schoolService: SchoolService) {}

  // Profil madrasah dipakai halaman login, sidebar, header, dan kop cetak.
  // Bersifat publik agar halaman login tidak memicu 401 → redirect berulang.
  @Public()
  @Get('profile')
  @ApiOperation({ summary: 'Get school profile' })
  async getProfile() {
    return this.schoolService.getProfile();
  }

  @RequirePermissions('settings.update')
  @Patch('profile')
  @ApiOperation({ summary: 'Update school profile' })
  async updateProfile(@Body() dto: UpdateSchoolDto) {
    return this.schoolService.updateProfile(dto);
  }

  @RequirePermissions('settings.update')
  @Post('profile/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueName = `logo-${Date.now()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|svg\+xml)$/)) {
          cb(null, true);
        } else {
          cb(new Error('Hanya file gambar yang diizinkan'), false);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload school logo' })
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    return this.schoolService.updateLogo(file.filename);
  }

  @AuthenticatedOnly()
  @Get('initialized')
  @ApiOperation({ summary: 'Check if system is initialized' })
  async isInitialized() {
    const initialized = await this.schoolService.isInitialized();
    return { isInitialized: initialized };
  }
}
