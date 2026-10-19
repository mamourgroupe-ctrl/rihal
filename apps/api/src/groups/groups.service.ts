import { Injectable, NotFoundException } from '@nestjs/common';

export type GroupStatus = 'DRAFT'|'READY'|'SUBMITTED'|'CONFIRMED'|'COMPLETED'|'CANCELLED';
export interface Group {
  id: string; tenantId: string; name: string; description?: string; maxSize: number;
  status: GroupStatus; memberCount: number; scheduledDate?: string; createdAt: string;
}

const mock: Group[] = [
  { id: 'g1', tenantId: 't1', name: 'فوج مكة 01', description: 'رمضان 1447 - فندق الصفوة', maxSize: 45, status: 'CONFIRMED', memberCount: 38, scheduledDate: '2026-03-20', createdAt: '2026-02-01' },
  { id: 'g2', tenantId: 't1', name: 'فوج المدينة 03', description: 'شوال 1447 - فندق دار الإيمان', maxSize: 30, status: 'READY', memberCount: 22, scheduledDate: '2026-04-05', createdAt: '2026-02-10' },
  { id: 'g3', tenantId: 't1', name: 'فوج جدة 02', description: 'عمرة رجب - اقتصادي', maxSize: 50, status: 'DRAFT', memberCount: 8, scheduledDate: '2026-04-12', createdAt: '2026-02-15' },
];

@Injectable()
export class GroupsService {
  private groups: Group[] = [...mock];
  findAll() { return this.groups; }
  findOne(id: string) {
    const g = this.groups.find(x => x.id === id);
    if (!g) throw new NotFoundException(`Group ${id} not found`);
    return g;
  }
  create(data: Partial<Group>) {
    const g: Group = {
      id: `g${Date.now().toString(36)}`,
      tenantId: 't1', name: data.name || 'فوج جديد',
      description: data.description, maxSize: data.maxSize || 30,
      status: (data.status as GroupStatus) || 'DRAFT',
      memberCount: 0, scheduledDate: data.scheduledDate,
      createdAt: new Date().toISOString(),
    };
    this.groups.push(g);
    return g;
  }
  update(id: string, data: Partial<Group>) {
    const idx = this.groups.findIndex(x => x.id === id);
    if (idx === -1) throw new NotFoundException(`Group ${id} not found`);
    this.groups[idx] = { ...this.groups[idx], ...data };
    return this.groups[idx];
  }
  remove(id: string) {
    const idx = this.groups.findIndex(x => x.id === id);
    if (idx === -1) throw new NotFoundException(`Group ${id} not found`);
    const [r] = this.groups.splice(idx, 1);
    return r;
  }
}
