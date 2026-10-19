import { Injectable, NotFoundException } from '@nestjs/common';

export type PilgrimStatus =
  | 'DRAFT' | 'REGISTERED' | 'DOCUMENTS_UPLOADED' | 'READY_FOR_BOOKING'
  | 'BOOKED' | 'PERMIT_ISSUED' | 'COMPLETED' | 'CANCELLED';

export interface Pilgrim {
  id: string; tenantId: string;
  fullNameAr: string; fullNameEn: string; passportNumber: string;
  passportExpiry: string; nationality: string; dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE'; phone?: string; email?: string;
  status: PilgrimStatus; notes?: string; groupId?: string; groupName?: string;
  createdAt: string; updatedAt: string;
}

const mock: Pilgrim[] = [
  { id: '1', tenantId: 't1', fullNameAr: 'عبد الله محمد أحمد', fullNameEn: 'Abdullah Mohamed Ahmed', passportNumber: 'A12345678', passportExpiry: '2030-01-01', nationality: 'DZ', status: 'READY_FOR_BOOKING', phone: '+213 555 123 456', groupId: 'g1', groupName: 'فوج مكة 01', createdAt: '2026-03-10', updatedAt: '2026-03-10' },
  { id: '2', tenantId: 't1', fullNameAr: 'فاطمة الزهراء بن علي', fullNameEn: 'Fatima Zahra Ben Ali', passportNumber: 'B87654321', passportExpiry: '2029-06-15', nationality: 'DZ', status: 'DOCUMENTS_UPLOADED', phone: '+213 555 987 654', groupId: 'g2', groupName: 'فوج المدينة 03', createdAt: '2026-03-12', updatedAt: '2026-03-12' },
  { id: '3', tenantId: 't1', fullNameAr: 'أحمد حسين القاضي', fullNameEn: 'Ahmed Hussein Al-Qadi', passportNumber: 'C11223344', passportExpiry: '2031-03-20', nationality: 'SA', status: 'BOOKED', phone: '+966 50 123 4567', groupId: 'g1', groupName: 'فوج مكة 01', createdAt: '2026-03-08', updatedAt: '2026-03-08' },
  { id: '4', tenantId: 't1', fullNameAr: 'مريم صالح التميمي', fullNameEn: 'Mariam Saleh Al-Tamimi', passportNumber: 'D55667788', passportExpiry: '2028-11-11', nationality: 'DZ', status: 'REGISTERED', groupId: 'g3', groupName: 'فوج جدة 02', createdAt: '2026-03-14', updatedAt: '2026-03-14' },
  { id: '5', tenantId: 't1', fullNameAr: 'يوسف إبراهيم', fullNameEn: 'Youssef Ibrahim', passportNumber: 'E99887766', passportExpiry: '2029-09-09', nationality: 'MA', status: 'COMPLETED', groupId: 'g1', groupName: 'فوج مكة 01', createdAt: '2026-02-28', updatedAt: '2026-02-28' },
  { id: '6', tenantId: 't1', fullNameAr: 'خديجة عبد الرحمن', fullNameEn: 'Khadija Abderrahmane', passportNumber: 'F44332211', passportExpiry: '2030-05-05', nationality: 'DZ', status: 'DRAFT', createdAt: '2026-03-15', updatedAt: '2026-03-15' },
];

@Injectable()
export class PilgrimsService {
  private pilgrims: Pilgrim[] = [...mock];

  findAll(query?: { status?: string; search?: string }) {
    let result = this.pilgrims;
    if (query?.status && query.status !== 'all') result = result.filter(p => p.status === query.status);
    if (query?.search) {
      const s = query.search.toLowerCase();
      result = result.filter(p =>
        p.fullNameAr.includes(query.search!) ||
        p.fullNameEn.toLowerCase().includes(s) ||
        p.passportNumber.toLowerCase().includes(s),
      );
    }
    return result;
  }

  findOne(id: string) {
    const p = this.pilgrims.find(x => x.id === id);
    if (!p) throw new NotFoundException(`Pilgrim ${id} not found`);
    return p;
  }

  create(data: Partial<Pilgrim>) {
    const now = new Date().toISOString();
    const p: Pilgrim = {
      id: Date.now().toString(36),
      tenantId: 't1',
      fullNameAr: data.fullNameAr || 'اسم جديد',
      fullNameEn: data.fullNameEn || 'New Pilgrim',
      passportNumber: data.passportNumber || `P${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      passportExpiry: data.passportExpiry || '2030-01-01',
      nationality: data.nationality || 'DZ',
      status: (data.status as PilgrimStatus) || 'DRAFT',
      phone: data.phone,
      groupId: data.groupId,
      groupName: data.groupName,
      createdAt: now,
      updatedAt: now,
    } as Pilgrim;
    this.pilgrims.unshift(p);
    return p;
  }

  update(id: string, data: Partial<Pilgrim>) {
    const idx = this.pilgrims.findIndex(x => x.id === id);
    if (idx === -1) throw new NotFoundException(`Pilgrim ${id} not found`);
    this.pilgrims[idx] = { ...this.pilgrims[idx], ...data, updatedAt: new Date().toISOString() };
    return this.pilgrims[idx];
  }

  remove(id: string) {
    const idx = this.pilgrims.findIndex(x => x.id === id);
    if (idx === -1) throw new NotFoundException(`Pilgrim ${id} not found`);
    const [removed] = this.pilgrims.splice(idx, 1);
    return removed;
  }

  stats() {
    const total = this.pilgrims.length;
    const byStatus = this.pilgrims.reduce((acc: any, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {});
    return { total, byStatus };
  }
}
