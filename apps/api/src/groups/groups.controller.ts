import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { Tenant } from '../common/tenant';
import { DataService } from '../domain/data.service';
import { GroupsService } from './groups.service';
import {
  AddMemberDto,
  CreateGroupDto,
  ListGroupsQueryDto,
  UpdateGroupDto,
} from './dto';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groups: GroupsService,
    private readonly data: DataService,
  ) {}

  /** GET /api/groups?status=READY */
  @Get()
  list(@Tenant() tenantId: string, @Query() query: ListGroupsQueryDto) {
    return this.data.listGroups(tenantId, { status: query.status });
  }

  /** GET /api/groups/:id */
  @Get(':id')
  findOne(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.groups.findOne(tenantId, id);
  }

  /** POST /api/groups */
  @Roles('ADMIN', 'OPERATOR', 'SUPERVISOR')
  @Post()
  create(@Tenant() tenantId: string, @Body() body: CreateGroupDto) {
    return this.data.createGroup(tenantId, body);
  }

  /** PATCH /api/groups/:id */
  @Roles('ADMIN', 'OPERATOR', 'SUPERVISOR')
  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateGroupDto,
  ) {
    return this.groups.update(tenantId, id, body);
  }

  /** DELETE /api/groups/:id */
  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Tenant() tenantId: string, @Param('id') id: string) {
    await this.groups.remove(tenantId, id);
  }

  /** POST /api/groups/:id/members */
  @Roles('ADMIN', 'OPERATOR', 'SUPERVISOR')
  @Post(':id/members')
  addMember(
    @Tenant() tenantId: string,
    @Param('id') groupId: string,
    @Body() body: AddMemberDto,
  ) {
    return this.data.addMember(
      tenantId,
      groupId,
      body.pilgrimId,
      body.isLeader ?? false,
    );
  }

  /** DELETE /api/groups/:id/members/:pilgrimId */
  @Roles('ADMIN', 'SUPERVISOR')
  @Delete(':id/members/:pilgrimId')
  removeMember(
    @Tenant() tenantId: string,
    @Param('id') groupId: string,
    @Param('pilgrimId') pilgrimId: string,
  ) {
    return this.groups.removeMember(tenantId, groupId, pilgrimId);
  }
}
