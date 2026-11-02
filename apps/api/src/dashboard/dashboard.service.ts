import { Injectable } from '@nestjs/common';
import type { InvoiceStatus, PilgrimStatus } from '@rihal/database';
import { PrismaService } from '../database/prisma.service';

export const PILGRIM_STATUSES = [
  'DRAFT',
  'REGISTERED',
  'DOCUMENTS_UPLOADED',
  'READY_FOR_BOOKING',
  'BOOKED',
  'PERMIT_ISSUED',
  'COMPLETED',
  'CANCELLED',
] as const satisfies readonly PilgrimStatus[];

export const INVOICE_STATUSES = [
  'DRAFT',
  'ISSUED',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const satisfies readonly InvoiceStatus[];

export interface DashboardOverview {
  generatedAt: string;
  summary: {
    pilgrims: {
      total: number;
      byStatus: Record<PilgrimStatus, number>;
    };
    groups: {
      total: number;
      active: number;
      capacity: number;
      occupied: number;
    };
    invoices: {
      count: number;
      byStatus: Record<InvoiceStatus, number>;
      totalAmount: number;
      paidAmount: number;
      outstandingAmount: number;
      currency: string;
    };
    documents: {
      total: number;
      verified: number;
      pending: number;
    };
    notifications: {
      pending: number;
      failed: number;
    };
  };
  recentPilgrims: DashboardPilgrim[];
  groups: DashboardGroup[];
  invoices: DashboardInvoice[];
}

export interface DashboardPilgrim {
  id: string;
  fullNameAr: string;
  fullNameEn: string;
  passportNumber: string;
  nationality: string;
  status: PilgrimStatus;
  createdAt: string;
}

export interface DashboardGroup {
  id: string;
  name: string;
  status: string;
  maxSize: number;
  memberCount: number;
  scheduledDate: string | null;
}

export interface DashboardInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string | null;
  dueDate: string | null;
}

/** Amounts are stored as Decimal; convert without leaking decimal.js objects into JSON. */
function toAmount(value: { toString(): string } | null | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

/**
 * Passport numbers stay out of list responses except for the last four digits,
 * so a stolen screen or a shared dashboard link cannot expose full identities.
 */
export function maskPassportNumber(passportNumber: string): string {
  const visible = passportNumber.slice(-4);
  return `••••${visible}`;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prismaService: PrismaService) {}

  async getOverview(tenantId: string): Promise<DashboardOverview> {
    const now = new Date();

    return this.prismaService.withTenant(tenantId, async (tx) => {
      const [
        pilgrimTotal,
        pilgrimGroups,
        groupTotal,
        activeGroupTotal,
        groupRows,
        invoiceGroups,
        documentTotal,
        verifiedDocumentTotal,
        pendingNotificationTotal,
        failedNotificationTotal,
        recentPilgrims,
        upcomingGroups,
        recentInvoices,
      ] = await Promise.all([
        tx.pilgrim.count({ where: { tenantId, archivedAt: null } }),
        tx.pilgrim.groupBy({
          by: ['status'],
          where: { tenantId, archivedAt: null },
          _count: { _all: true },
        }),
        tx.group.count({ where: { tenantId, archivedAt: null } }),
        tx.group.count({
          where: { tenantId, archivedAt: null, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        }),
        tx.group.findMany({
          where: { tenantId, archivedAt: null },
          orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'desc' }],
          take: 12,
          select: {
            id: true,
            name: true,
            status: true,
            maxSize: true,
            scheduledDate: true,
            _count: { select: { members: { where: { archivedAt: null } } } },
          },
        }),
        tx.invoice.groupBy({
          by: ['status'],
          where: { tenantId, archivedAt: null },
          _count: { _all: true },
          _sum: { amount: true },
        }),
        tx.document.count({ where: { tenantId, archivedAt: null } }),
        tx.document.count({ where: { tenantId, archivedAt: null, verified: true } }),
        tx.notification.count({ where: { tenantId, archivedAt: null, status: 'PENDING' } }),
        tx.notification.count({ where: { tenantId, archivedAt: null, status: 'FAILED' } }),
        tx.pilgrim.findMany({
          where: { tenantId, archivedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            id: true,
            fullNameAr: true,
            fullNameEn: true,
            passportNumber: true,
            nationality: true,
            status: true,
            createdAt: true,
          },
        }),
        tx.group.findMany({
          where: { tenantId, archivedAt: null, scheduledDate: { gte: now } },
          orderBy: { scheduledDate: 'asc' },
          take: 6,
          select: {
            id: true,
            name: true,
            status: true,
            maxSize: true,
            scheduledDate: true,
            _count: { select: { members: { where: { archivedAt: null } } } },
          },
        }),
        tx.invoice.findMany({
          where: { tenantId, archivedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            id: true,
            invoiceNumber: true,
            customerName: true,
            amount: true,
            currency: true,
            status: true,
            issuedAt: true,
            dueDate: true,
          },
        }),
      ]);

      const pilgrimsByStatus = Object.fromEntries(
        PILGRIM_STATUSES.map((status) => [status, 0]),
      ) as Record<PilgrimStatus, number>;
      for (const row of pilgrimGroups) {
        pilgrimsByStatus[row.status] = row._count._all;
      }

      const invoicesByStatus = Object.fromEntries(
        INVOICE_STATUSES.map((status) => [status, 0]),
      ) as Record<InvoiceStatus, number>;
      let invoiceCount = 0;
      let paidAmount = 0;
      for (const row of invoiceGroups) {
        invoicesByStatus[row.status] = row._count._all;
        invoiceCount += row._count._all;
        if (row.status === 'PAID') {
          paidAmount += toAmount(row._sum.amount);
        }
      }
      const outstandingAmount = invoiceGroups
        .filter((row) => row.status === 'ISSUED' || row.status === 'OVERDUE')
        .reduce((total, row) => total + toAmount(row._sum.amount), 0);

      const groups: DashboardGroup[] = [...groupRows, ...upcomingGroups]
        .map((group) => ({
          id: group.id,
          name: group.name,
          status: group.status,
          maxSize: group.maxSize,
          memberCount: group._count.members,
          scheduledDate: group.scheduledDate?.toISOString() ?? null,
        }))
        .filter((group, index, all) => all.findIndex((item) => item.id === group.id) === index)
        .slice(0, 12);

      return {
        generatedAt: new Date().toISOString(),
        summary: {
          pilgrims: {
            total: pilgrimTotal,
            byStatus: pilgrimsByStatus,
          },
          groups: {
            total: groupTotal,
            active: activeGroupTotal,
            capacity: groups.reduce((total, group) => total + group.maxSize, 0),
            occupied: groups.reduce((total, group) => total + group.memberCount, 0),
          },
          invoices: {
            count: invoiceCount,
            byStatus: invoicesByStatus,
            totalAmount: Math.round((paidAmount + outstandingAmount) * 100) / 100,
            paidAmount,
            outstandingAmount,
            currency: recentInvoices[0]?.currency ?? 'SAR',
          },
          documents: {
            total: documentTotal,
            verified: verifiedDocumentTotal,
            pending: Math.max(documentTotal - verifiedDocumentTotal, 0),
          },
          notifications: {
            pending: pendingNotificationTotal,
            failed: failedNotificationTotal,
          },
        },
        recentPilgrims: recentPilgrims.map((pilgrim) => ({
          ...pilgrim,
          passportNumber: maskPassportNumber(pilgrim.passportNumber),
          createdAt: pilgrim.createdAt.toISOString(),
        })),
        groups,
        invoices: recentInvoices.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          amount: toAmount(invoice.amount),
          currency: invoice.currency,
          status: invoice.status,
          issuedAt: invoice.issuedAt?.toISOString() ?? null,
          dueDate: invoice.dueDate?.toISOString() ?? null,
        })),
      };
    });
  }

  async listPilgrims(
    tenantId: string,
    options: { status?: PilgrimStatus; limit: number },
  ): Promise<DashboardPilgrim[]> {
    return this.prismaService.withTenant(tenantId, async (tx) => {
      const pilgrims = await tx.pilgrim.findMany({
        where: {
          tenantId,
          archivedAt: null,
          ...(options.status ? { status: options.status } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit,
        select: {
          id: true,
          fullNameAr: true,
          fullNameEn: true,
          passportNumber: true,
          nationality: true,
          status: true,
          createdAt: true,
        },
      });

      return pilgrims.map((pilgrim) => ({
        ...pilgrim,
        passportNumber: maskPassportNumber(pilgrim.passportNumber),
        createdAt: pilgrim.createdAt.toISOString(),
      }));
    });
  }
}
