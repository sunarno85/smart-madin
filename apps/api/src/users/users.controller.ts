import {
  Controller, Get, Post, Patch, Body, Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@RequirePermissions('users.read')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Create user' })
  async create(
    @Body() body: {
      username: string;
      email: string;
      password: string;
      fullName?: string;
      roleIds?: string[];
    },
  ) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id') id: string,
    @Body() body: {
      email?: string;
      fullName?: string;
      isActive?: boolean;
      roleIds?: string[];
    },
  ) {
    return this.usersService.update(id, body);
  }

  @Patch(':id/reset-password')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Reset user password' })
  async resetPassword(
    @Param('id') id: string,
    @Body() body: { password: string },
  ) {
    return this.usersService.resetPassword(id, body.password);
  }

  @Patch(':id/toggle-active')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Toggle user active status' })
  async toggleActive(@Param('id') id: string) {
    return this.usersService.toggleActive(id);
  }
}
