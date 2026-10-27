import { Injectable } from '@nestjs/common';
import type { Invoice, InvoiceItem, InvoiceStatus } from '@rihal/database';
import { PrismaService } from '../database/prisma.service';
import { DomainRuleError } from './domain.errors';
import { assertInvoiceTransition } from './status-transitions';

const maxInvoiceCents = 9_999_999_999n;

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: string;
}

export interface CreateInvoiceInput {
  invoiceNumber: string;
  customerName?: string | null;
  pilgrimId?: string | null;
  currency?: string;
  dueDate?: Date | null;
  items: readonly InvoiceLineInput[];
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
}

@Injectable()
export class InvoicesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(tenantId: string, input: CreateInvoiceInput): Promise<InvoiceWithItems> {
    const invoiceNumber = input.invoiceNumber.trim();
    const currency = (input.currency ?? 'SAR').trim().toUpperCase();
    const pilgrimId = input.pilgrimId?.trim() || null;
    if (!tenantId || !invoiceNumber || !/^[A-Z]{3}$/.test(currency) || input.items.length === 0) {
      throw new DomainRuleError('INVALID_INPUT', 'A tenant, invoice number, currency, and at least one line item are required.');
    }

    const lines = input.items.map((item) => {
      const description = item.description.trim();
      if (!description || !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
        throw new DomainRuleError('INVALID_INPUT', 'Invoice line descriptions and positive integer quantities are required.');
      }
      const unitPriceCents = parseMoneyToCents(item.unitPrice);
      const lineTotalCents = unitPriceCents * BigInt(item.quantity);
      if (lineTotalCents > maxInvoiceCents) {
        throw new DomainRuleError('INVALID_INPUT', 'Invoice line exceeds the supported monetary range.');
      }
      return { description, quantity: item.quantity, unitPriceCents, lineTotalCents };
    });
    const amountCents = lines.reduce((total, line) => total + line.lineTotalCents, 0n);
    if (amountCents > maxInvoiceCents) {
      throw new DomainRuleError('INVALID_INPUT', 'Invoice total exceeds the supported monetary range.');
    }

    try {
      return await this.prismaService.client.$transaction(async (tx) => {
        let customerName = input.customerName?.trim() || null;
        if (pilgrimId) {
          const pilgrim = await tx.pilgrim.findFirst({
            where: { id: pilgrimId, tenantId, archivedAt: null },
            select: { fullNameEn: true },
          });
          if (!pilgrim) {
            throw new DomainRuleError('NOT_FOUND', 'Pilgrim not found.');
          }
          customerName ??= pilgrim.fullNameEn;
        }
        if (!customerName) {
          throw new DomainRuleError('INVALID_INPUT', 'An invoice must identify a customer or a pilgrim.');
        }

        const invoice = await tx.invoice.create({
          data: {
            tenantId,
            invoiceNumber,
            customerName,
            pilgrimId,
            amount: formatMoney(amountCents),
            currency,
            dueDate: input.dueDate ?? null,
          },
        });
        await tx.invoiceItem.createMany({
          data: lines.map((line) => ({
            tenantId,
            invoiceId: invoice.id,
            description: line.description,
            quantity: line.quantity,
            unitPrice: formatMoney(line.unitPriceCents),
            lineTotal: formatMoney(line.lineTotalCents),
          })),
        });
        return tx.invoice.findUniqueOrThrow({
          where: { tenantId_id: { tenantId, id: invoice.id } },
          include: {
            items: {
              where: { archivedAt: null },
              orderBy: { createdAt: 'asc' },
            },
          },
        });
      });
    } catch (error) {
      const errorCode = getPrismaErrorCode(error);
      if (errorCode === 'P2002') {
        throw new DomainRuleError('CONFLICT', 'An invoice with this number already exists for the tenant.');
      }
      if (errorCode === 'P2003') {
        throw new DomainRuleError('INVALID_ASSOCIATION', 'Invoice references must belong to the same tenant.');
      }
      throw error;
    }
  }

  async transitionStatus(
    tenantId: string,
    invoiceId: string,
    nextStatus: InvoiceStatus,
    now = new Date(),
  ): Promise<Invoice> {
    return this.prismaService.client.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId, archivedAt: null },
      });
      if (!invoice) {
        throw new DomainRuleError('NOT_FOUND', 'Invoice not found.');
      }

      assertInvoiceTransition(invoice.status, nextStatus);
      if (nextStatus === ('OVERDUE' as InvoiceStatus) && (!invoice.dueDate || invoice.dueDate > now)) {
        throw new DomainRuleError('INVOICE_NOT_DUE', 'An invoice cannot become overdue before its due date.');
      }

      const updated = await tx.invoice.updateMany({
        where: {
          id: invoiceId,
          tenantId,
          status: invoice.status,
          archivedAt: null,
        },
        data: {
          status: nextStatus,
          ...(nextStatus === ('ISSUED' as InvoiceStatus) ? { issuedAt: now } : {}),
          ...(nextStatus === ('PAID' as InvoiceStatus) ? { paidAt: now } : {}),
        },
      });
      if (updated.count !== 1) {
        throw new DomainRuleError('CONFLICT', 'Invoice state changed concurrently.');
      }

      return tx.invoice.findFirstOrThrow({ where: { id: invoiceId, tenantId, archivedAt: null } });
    });
  }

  async archive(tenantId: string, invoiceId: string): Promise<void> {
    await this.prismaService.client.$transaction(async (tx) => {
      const archivedAt = new Date();
      const invoice = await tx.invoice.updateMany({
        where: { id: invoiceId, tenantId, archivedAt: null },
        data: { archivedAt },
      });
      if (invoice.count !== 1) {
        throw new DomainRuleError('NOT_FOUND', 'Invoice not found.');
      }
      await tx.invoiceItem.updateMany({
        where: { tenantId, invoiceId, archivedAt: null },
        data: { archivedAt },
      });
    });
  }
}

function parseMoneyToCents(value: string): bigint {
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value)) {
    throw new DomainRuleError('INVALID_INPUT', 'Invoice prices must be non-negative decimal amounts with at most two decimal places.');
  }
  const [whole, fraction = ''] = value.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > maxInvoiceCents) {
    throw new DomainRuleError('INVALID_INPUT', 'Invoice price exceeds the supported monetary range.');
  }
  return cents;
}

function formatMoney(cents: bigint): string {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

function getPrismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}
