import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataService } from '../domain/data.service';
import { Group } from '../domain/types';
import { UpdateGroupDto } from './dto';

@Injectable()
export class GroupsService {
  constructor(private readonly data: DataService) {}

  async findOne(tenantId: string, id: string): Promise<Group> {
    const group = await this.data.findGroup(tenantId, id);
    if (!group) {
      throw new HttpException('المجموعة غير موجودة', HttpStatus.NOT_FOUND);
    }
    return group;
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateGroupDto,
  ): Promise<Group> {
    const updated = await this.data.updateGroup(tenantId, id, input);
    if (!updated) {
      throw new HttpException('المجموعة غير موجودة', HttpStatus.NOT_FOUND);
    }
    return updated;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const deleted = await this.data.deleteGroup(tenantId, id);
    if (!deleted) {
      throw new HttpException('المجموعة غير موجودة', HttpStatus.NOT_FOUND);
    }
  }

  async removeMember(
    tenantId: string,
    groupId: string,
    pilgrimId: string,
  ): Promise<Group> {
    const group = await this.data.removeMember(tenantId, groupId, pilgrimId);
    if (!group) {
      throw new HttpException('المجموعة غير موجودة', HttpStatus.NOT_FOUND);
    }
    return group;
  }
}
