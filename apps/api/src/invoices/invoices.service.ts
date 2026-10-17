import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataService } from '../domain/data.service';
import {
  Invoice,
  InvoiceListQuery,
  InvoiceStatus,
  Tenant,
} from '../domain/types';
import { CreateInvoiceDto } from './dto';
import {
  buildUblInvoiceXml,
  decodeZatcaQr,
  issueInvoiceArtifacts,
  sellerFromTenant,
} from './zatca';

@Injectable()
export class InvoicesService {
  constructor(private readonly data: DataService) {}

  async list(tenantId: string, query: InvoiceListQuery) {
    const result = await this.data.listInvoices(tenantId, query);
    const totals = result.items.reduce(
      (sum, invoice) =>
        invoice.status === 'CANCELLED'
          ? sum
          : {
              issued: sum.issued + (invoice.status === 'ISSUED' ? invoice.total : 0),
              paid: sum.paid + (invoice.status === 'PAID' ? invoice.total : 0),
              vat: sum.vat + invoice.vatAmount,
            },
      { issued: 0, paid: 0, vat: 0 },
    );
    return {
      ...result,
      summary: {
        issued: Math.round(totals.issued * 100) / 100,
        paid: Math.round(totals.paid * 100) / 100,
        vat: Math.round(totals.vat * 100) / 100,
      },
    };
  }

  async findOne(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.data.findInvoice(tenantId, id);
    if (!invoice) throw new NotFoundException('الفاتورة غير موجودة');
    return invoice;
  }

  create(tenantId: string, input: CreateInvoiceDto): Promise<Invoice> {
    return this.data.createInvoice(tenantId, input);
  }

  /**
   * Issues a draft: assigns the sequential number, UUID, timestamp, ZATCA QR
   * and the hash chained to the tenant's previous invoice. Irreversible.
   */
  async issue(
    tenantId: string,
    id: string,
  ): Promise<{ invoice: Invoice; xml: string }> {
    const invoice = await this.findOne(tenantId, id);
    if (invoice.status !== 'DRAFT') {
      throw new ConflictException(
        `لا يمكن إصدار فاتورة في حالة ${invoice.status}`,
      );
    }
    if (!invoice.items.length) {
      throw new ConflictException('الفاتورة لا تحتوي بنوداً');
    }

    const tenant = await this.data.findTenantById(tenantId);
    if (!tenant) throw new NotFoundException('الوكالة غير موجودة');

    const year = new Date().getUTCFullYear();
    const [issuedCount, previous] = await Promise.all([
      this.data.countIssuedInvoices(tenantId, year),
      this.data.lastIssuedInvoice(tenantId),
    ]);

    const seller = sellerFromTenant(tenant);
    const artifacts = issueInvoiceArtifacts(
      invoice,
      seller,
      issuedCount + 1,
      previous?.zatcaHash ?? null,
    );

    const updated = await this.data.updateInvoice(tenantId, id, {
      status: 'ISSUED',
      invoiceNumber: artifacts.invoiceNumber,
      uuid: artifacts.uuid,
      zatcaQr: artifacts.zatcaQr,
      zatcaHash: artifacts.zatcaHash,
      previousHash: artifacts.previousHash,
      issuedAt: artifacts.issuedAt,
    });

    return {
      invoice: updated ?? invoice,
      xml: artifacts.xml,
    };
  }

  async markPaid(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.findOne(tenantId, id);
    if (invoice.status === 'PAID') return invoice;
    if (!['ISSUED', 'OVERDUE'].includes(invoice.status)) {
      throw new ConflictException(
        'لا يمكن تسجيل الدفع إلا لفاتورة صادرة أو متأخرة',
      );
    }

    const updated = await this.data.updateInvoice(tenantId, id, {
      status: 'PAID',
      paidAt: new Date().toISOString(),
    });
    return updated ?? invoice;
  }

  async cancel(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.findOne(tenantId, id);
    if (['PAID', 'CANCELLED'].includes(invoice.status)) {
      throw new HttpException(
        `لا يمكن إلغاء فاتورة ${invoice.status}`,
        HttpStatus.CONFLICT,
      );
    }
    const updated = await this.data.updateInvoice(tenantId, id, {
      status: 'CANCELLED',
    });
    return updated ?? invoice;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const invoice = await this.findOne(tenantId, id);
    if (invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED') {
      throw new ConflictException(
        'لا يمكن حذف فاتورة صادرة — ألغِها للتوثيق',
      );
    }
    await this.data.deleteInvoice(tenantId, id);
  }

  /** ZATCA QR payload + decoded fields for auditing. */
  async qr(
    tenantId: string,
    id: string,
  ): Promise<{ base64: string; fields: Array<{ tag: number; value: string }> }> {
    const invoice = await this.findOne(tenantId, id);
    if (!invoice.zatcaQr) {
      throw new ConflictException('الفاتورة لم تُصدر بعد — لا يوجد رمز QR');
    }
    return {
      base64: invoice.zatcaQr,
      fields: decodeZatcaQr(invoice.zatcaQr),
    };
  }

  /** UBL 2.1 XML, regenerated deterministically from the stored invoice. */
  async xml(tenantId: string, id: string): Promise<{ invoice: Invoice; xml: string }> {
    const invoice = await this.findOne(tenantId, id);
    if (!invoice.invoiceNumber || !invoice.uuid || !invoice.issuedAt) {
      throw new ConflictException('الفاتورة لم تُصدر بعد');
    }
    const tenant = (await this.data.findTenantById(tenantId)) as Tenant;
    const xml = buildUblInvoiceXml({
      invoice,
      seller: sellerFromTenant(tenant),
      invoiceNumber: invoice.invoiceNumber,
      uuid: invoice.uuid,
      issuedAt: new Date(invoice.issuedAt),
      zatcaQr: invoice.zatcaQr ?? '',
    });
    return { invoice, xml };
  }

  async stats(tenantId: string): Promise<{
    total: number;
    byStatus: Record<InvoiceStatus, number>;
    issuedAmount: number;
    paidAmount: number;
    vatCollected: number;
  }> {
    const all = await this.data.listInvoices(tenantId, {
      page: 1,
      limit: 1000,
    });
    const byStatus: Record<InvoiceStatus, number> = {
      DRAFT: 0,
      ISSUED: 0,
      PAID: 0,
      OVERDUE: 0,
      CANCELLED: 0,
    };
    let issuedAmount = 0;
    let paidAmount = 0;
    let vatCollected = 0;
    for (const invoice of all.items) {
      byStatus[invoice.status] += 1;
      if (invoice.status === 'CANCELLED') continue;
      vatCollected += invoice.vatAmount;
      if (invoice.status === 'ISSUED') issuedAmount += invoice.total;
      if (invoice.status === 'PAID') paidAmount += invoice.total;
    }
    const round = (value: number) => Math.round(value * 100) / 100;
    return {
      total: all.total,
      byStatus,
      issuedAmount: round(issuedAmount),
      paidAmount: round(paidAmount),
      vatCollected: round(vatCollected),
    };
  }
}
