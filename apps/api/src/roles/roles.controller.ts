import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@RequirePermissions('roles.read')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all roles' })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get('permissions/tree')
  @ApiOperation({ summary: 'Get permissions as module→actions tree' })
  async getPermissionTree() {
    return this.rolesService.getPermissionTree();
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Get all permissions' })
  async findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role detail with permissions and users' })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @RequirePermissions('roles.create')
  @ApiOperation({ summary: 'Create role' })
  async create(@Body() body: { name: string; description?: string }) {
    return this.rolesService.create(body);
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  @ApiOperation({ summary: 'Update role' })
  async update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.rolesService.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('roles.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role' })
  async delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }

  @Patch(':id/permissions')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Replace role permissions (by permission IDs)' })
  async updatePermissions(@Param('id') id: string, @Body() body: { permissionIds: string[] }) {
    return this.rolesService.updatePermissions(id, body.permissionIds);
  }

  @Patch(':id/permissions/set')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Set role permissions by module+actions' })
  async setPermissions(
    @Param('id') id: string,
    @Body() body: { permissions: { module: string; actions: string[] }[] },
  ) {
    return this.rolesService.setPermissions(id, body.permissions);
  }

  @Post(':id/reset-permissions')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Reset role permissions to defaults' })
  async resetPermissions(@Param('id') id: string) {
    return this.rolesService.resetPermissionsToDefault(id);
  }
}
