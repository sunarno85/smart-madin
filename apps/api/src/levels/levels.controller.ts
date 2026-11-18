import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { LevelsService } from './levels.service';
import { CreateLevelDto, UpdateLevelDto } from './dto/create-level.dto';

@ApiTags('Levels')
@ApiBearerAuth()
@Controller('levels')
@RequirePermissions('levels.read')
export class LevelsController {
  constructor(private levelsService: LevelsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all levels' })
  async findAll() {
    return this.levelsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get level by ID' })
  async findOne(@Param('id') id: string) {
    return this.levelsService.findOne(id);
  }

  @Post()
  @RequirePermissions('levels.create')
  @ApiOperation({ summary: 'Create level' })
  async create(@Body() dto: CreateLevelDto) {
    return this.levelsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('levels.update')
  @ApiOperation({ summary: 'Update level' })
  async update(@Param('id') id: string, @Body() dto: UpdateLevelDto) {
    return this.levelsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('levels.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete level' })
  async delete(@Param('id') id: string) {
    return this.levelsService.delete(id);
  }
}
