import { Injectable } from '@nestjs/common';
export type InvoiceStatus = 'DRAFT'|'ISSUED'|'PAID'|'OVERDUE'|'CANCELLED';
export interface Invoice { id: string; tenantId: string; invoiceNumber: string; amount: number; currency: string; status: InvoiceStatus; dueDate?: string; createdAt: string; }
const mock: Invoice[] = [
  { id: 'inv1', tenantId: 't1', invoiceNumber: 'INV-2026-001', amount: 245000, currency: 'DZD', status: 'PAID', dueDate: '2026-03-15', createdAt: '2026-03-01' },
  { id: 'inv2', tenantId: 't1', invoiceNumber: 'INV-2026-002', amount: 189000, currency: 'DZD', status: 'ISSUED', dueDate: '2026-03-20', createdAt: '2026-03-05' },
  { id: 'inv3', tenantId: 't1', invoiceNumber: 'INV-2026-003', amount: 320000, currency: 'DZD', status: 'OVERDUE', dueDate: '2026-03-10', createdAt: '2026-03-06' },
];
@Injectable()
export class InvoicesService {
  private invoices = [...mock];
  findAll() { return this.invoices; }
  create(data: Partial<Invoice>) {
    const inv: Invoice = {
      id: `inv${Date.now().toString(36)}`, tenantId: 't1',
      invoiceNumber: data.invoiceNumber || `INV-2026-${String(this.invoices.length+1).padStart(3,'0')}`,
      amount: data.amount || 0, currency: data.currency || 'DZD',
      status: (data.status as InvoiceStatus) || 'DRAFT', dueDate: data.dueDate,
      createdAt: new Date().toISOString(),
    };
    this.invoices.push(inv);
    return inv;
  }
  stats() {
    const total = this.invoices.reduce((s,i)=>s+i.amount,0);
    const paid = this.invoices.filter(i=>i.status==='PAID').reduce((s,i)=>s+i.amount,0);
    const overdue = this.invoices.filter(i=>i.status==='OVERDUE').reduce((s,i)=>s+i.amount,0);
    return { total, paid, overdue, count: this.invoices.length };
  }
}
