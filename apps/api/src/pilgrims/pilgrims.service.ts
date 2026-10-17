import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataService } from '../domain/data.service';
import { Pilgrim, PilgrimListQuery } from '../domain/types';
import { CreatePilgrimDto, UpdatePilgrimDto } from './dto';

@Injectable()
export class PilgrimsService {
  constructor(private readonly data: DataService) {}

  list(tenantId: string, query: PilgrimListQuery) {
    return this.data.listPilgrims(tenantId, query);
  }

  async findOne(tenantId: string, id: string): Promise<Pilgrim> {
    const pilgrim = await this.data.findPilgrim(tenantId, id);
    if (!pilgrim) {
      throw new HttpException('المعتمر غير موجود', HttpStatus.NOT_FOUND);
    }
    return pilgrim;
  }

  create(tenantId: string, input: CreatePilgrimDto): Promise<Pilgrim> {
    return this.data.createPilgrim(tenantId, input);
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdatePilgrimDto,
  ): Promise<Pilgrim> {
    const updated = await this.data.updatePilgrim(tenantId, id, input);
    if (!updated) {
      throw new HttpException('المعتمر غير موجود', HttpStatus.NOT_FOUND);
    }
    return updated;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const deleted = await this.data.deletePilgrim(tenantId, id);
    if (!deleted) {
      throw new HttpException('المعتمر غير موجود', HttpStatus.NOT_FOUND);
    }
  }
}
