import { createHash, randomUUID } from 'node:crypto';
import { Invoice, Tenant, ZatcaQrPayload } from '../domain/types';

/**
 * ZATCA (Saudi Zakat, Tax and Customs Authority) e-invoicing helpers.
 *
 * Implements the parts that are deterministic and verifiable offline:
 *  - Phase 1 QR payload (base64 TLV, tags 1-5)
 *  - Invoice UUID + SHA-256 hash chained to the previous invoice
 *  - UBL 2.1 XML for a simplified tax invoice (InvoiceTypeCode 388)
 *
 * The cryptographic stamp (CSID / XAdES signature) requires ZATCA onboarding
 * credentials and is intentionally out of scope; the hash chain and QR are the
 * verifiable core and match what the Fatoora app reads.
 */

/** Encodes a string as a TLV field: [tag, length, ...UTF-8 bytes]. */
function tlv(tag: number, value: string): Buffer {
  const bytes = Buffer.from(value, 'utf8');
  if (bytes.length > 255) {
    throw new Error(`TLV field ${tag} exceeds 255 bytes`);
  }
  return Buffer.concat([Buffer.from([tag, bytes.length]), bytes]);
}

export function buildZatcaQrPayload(payload: ZatcaQrPayload): string {
  return Buffer.concat([
    tlv(1, payload.sellerName),
    tlv(2, payload.vatNumber),
    tlv(3, payload.timestamp),
    tlv(4, payload.totalWithVat),
    tlv(5, payload.vatTotal),
  ]).toString('base64');
}

export interface DecodedQrField {
  tag: number;
  value: string;
}

/** Used by tests and the API preview endpoint to prove the QR is well-formed. */
export function decodeZatcaQr(base64: string): DecodedQrField[] {
  const buffer = Buffer.from(base64, 'base64');
  const fields: DecodedQrField[] = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const tag = buffer[offset];
    const length = buffer[offset + 1];
    const start = offset + 2;
    const end = start + length;
    if (end > buffer.length) break;
    fields.push({ tag, value: buffer.subarray(start, end).toString('utf8') });
    offset = end;
  }
  return fields;
}

export interface ZatcaIdentity {
  sellerName: string;
  vatNumber: string;
  crNumber?: string | null;
  addressLine?: string | null;
  city?: string | null;
  country?: string | null;
}

export function sellerFromTenant(tenant: Tenant): ZatcaIdentity {
  return {
    sellerName: tenant.name,
    vatNumber: tenant.vatNumber ?? '000000000000003',
    crNumber: tenant.crNumber ?? null,
    addressLine: tenant.addressLine ?? null,
    city: tenant.city ?? null,
    country: tenant.country ?? 'SA',
  };
}

export interface IssuedInvoiceArtifacts {
  invoiceNumber: string;
  uuid: string;
  issuedAt: string;
  zatcaQr: string;
  zatcaHash: string;
  previousHash: string | null;
  xml: string;
}

/**
 * Builds everything that must be frozen when an invoice is issued:
 * sequence number, UUID, timestamp, QR and the hash-chain link.
 */
export function issueInvoiceArtifacts(
  invoice: Invoice,
  seller: ZatcaIdentity,
  sequence: number,
  previousHash: string | null,
  issuedAt: Date = new Date(),
): IssuedInvoiceArtifacts {
  const year = issuedAt.getUTCFullYear();
  const invoiceNumber = `INV-${year}-${String(sequence).padStart(4, '0')}`;
  const uuid = randomUUID();
  const timestamp = issuedAt.toISOString().replace('Z', '');

  const zatcaQr = buildZatcaQrPayload({
    sellerName: seller.sellerName,
    vatNumber: seller.vatNumber,
    timestamp,
    totalWithVat: invoice.total.toFixed(2),
    vatTotal: invoice.vatAmount.toFixed(2),
  });

  const xml = buildUblInvoiceXml({
    invoice,
    seller,
    invoiceNumber,
    uuid,
    issuedAt,
    zatcaQr,
  });

  // ZATCA chains invoices: hash = SHA-256(previousHash + invoice content).
  const zatcaHash = createHash('sha256')
    .update((previousHash ?? '0') + xml)
    .digest('base64');

  return {
    invoiceNumber,
    uuid,
    issuedAt: issuedAt.toISOString(),
    zatcaQr,
    zatcaHash,
    previousHash,
    xml,
  };
}

export interface UblInvoiceInput {
  invoice: Invoice;
  seller: ZatcaIdentity;
  invoiceNumber: string;
  uuid: string;
  issuedAt: Date;
  zatcaQr: string;
}

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** UBL 2.1 simplified tax invoice (B2C / standard 388 with VAT breakdown). */
export function buildUblInvoiceXml(input: UblInvoiceInput): string {
  const { invoice, seller, invoiceNumber, uuid, issuedAt, zatcaQr } = input;
  const issueDate = issuedAt.toISOString().slice(0, 10);
  const issueTime = issuedAt.toISOString().slice(11, 19);
  const currency = invoice.currency || 'SAR';

  const lines = invoice.items
    .map((item, index) => {
      const lineVat = round2(item.lineTotal * invoice.vatRate);
      return `  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="PCE">${item.quantity.toFixed(2)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${item.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${currency}">${lineVat.toFixed(2)}</cbc:TaxAmount>
      <cbc:RoundingAmount currencyID="${currency}">${(item.lineTotal + lineVat).toFixed(2)}</cbc:RoundingAmount>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${escapeXml(item.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${(invoice.vatRate * 100).toFixed(2)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${invoiceNumber}</cbc:ID>
  <cbc:UUID>${uuid}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${currency}</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>QR</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${zatcaQr}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(seller.addressLine ?? '')}</cbc:StreetName>
        <cbc:CityName>${escapeXml(seller.city ?? '')}</cbc:CityName>
        <cbc:CountrySubentityCode>${escapeXml(seller.country ?? 'SA')}</cbc:CountrySubentityCode>
        <cac:Country><cbc:IdentificationCode>${escapeXml(seller.country ?? 'SA')}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(seller.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(seller.sellerName)}</cbc:RegistrationName>
        ${seller.crNumber ? `<cbc:CompanyID>${escapeXml(seller.crNumber)}</cbc:CompanyID>` : ''}
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(invoice.buyerName)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      ${invoice.buyerVatNumber ? `<cac:PartyTaxScheme><cbc:CompanyID>${escapeXml(invoice.buyerVatNumber)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${invoice.vatAmount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${invoice.subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${invoice.vatAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${(invoice.vatRate * 100).toFixed(2)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${invoice.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${invoice.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currency}">${invoice.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines}
</Invoice>`;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
