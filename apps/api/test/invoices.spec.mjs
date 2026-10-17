import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.PERSISTENCE = 'memory';
process.env.JWT_SECRET = 'test-secret-for-rihal-invoices';

const { createApp } = await import('../dist/app.factory.js');

let app;
let baseUrl;
let adminToken;
let viewerToken;
let supervisorToken;

async function call(path, options = {}) {
  const { token, ...rest } = options;
  const response = await fetch(baseUrl + path, {
    ...rest,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(rest.headers ?? {}),
    },
  });
  const text = await response.text();
  const isJson = (response.headers.get('content-type') ?? '').includes('json');
  return {
    status: response.status,
    body: text ? (isJson ? JSON.parse(text) : text) : null,
    headers: response.headers,
  };
}

async function login(email, password = 'Rihal@2026') {
  const result = await call('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return result.body.accessToken;
}

async function newAgencyToken(label) {
  const suffix = `${label}${Date.now().toString(36)}`;
  const registration = await call('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      agencyName: `وكالة ${label}`,
      slug: `billing-${suffix}`,
      name: `مدير ${label}`,
      email: `billing-${suffix}@agency.demo`,
      password: 'Billing2026',
    }),
  });
  assert.equal(registration.status, 201, JSON.stringify(registration.body));
  return registration.body.accessToken;
}

const invoiceBody = (overrides = {}) => ({
  buyerName: 'شركة النور للسياحة',
  buyerVatNumber: '300000000000003',
  items: [
    { description: 'باقة عمرة — 7 أيام', quantity: 2, unitPrice: 500 },
    { description: 'تأمين طبي', quantity: 1, unitPrice: 250 },
  ],
  ...overrides,
});

async function createInvoice(token, overrides) {
  return call('/invoices', {
    method: 'POST',
    token,
    body: JSON.stringify(invoiceBody(overrides)),
  });
}

before(async () => {
  app = await createApp();
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  baseUrl = `http://127.0.0.1:${address.port}/api`;

  adminToken = await login('admin@rihal.demo');
  viewerToken = await login('viewer@rihal.demo');
  supervisorToken = await login('supervisor@rihal.demo');
});

after(async () => {
  await app.close();
});

describe('Invoices — drafts & VAT', () => {
  it('creates a draft with 15% VAT rounded to two decimals', async () => {
    const token = await newAgencyToken('vat');
    const { status, body } = await createInvoice(token);

    assert.equal(status, 201, JSON.stringify(body));
    assert.equal(body.status, 'DRAFT');
    assert.equal(body.invoiceNumber, null);
    assert.equal(body.subtotal, 1250);
    assert.equal(body.vatRate, 0.15);
    assert.equal(body.vatAmount, 187.5);
    assert.equal(body.total, 1437.5);
    assert.equal(body.items.length, 2);
    assert.equal(body.items[0].lineTotal, 1000);
  });

  it('rounds line and VAT amounts half-up', async () => {
    const token = await newAgencyToken('rounding');
    const { status, body } = await createInvoice(token, {
      items: [{ description: 'باقة', quantity: 3, unitPrice: 33.33 }],
    });
    assert.equal(status, 201, JSON.stringify(body));
    assert.equal(body.subtotal, 99.99);
    assert.equal(body.vatAmount, 15); // 99.99 × 0.15 = 14.9985 → 15.00
    assert.equal(body.total, 114.99);
  });

  it('validates the payload with Arabic messages', async () => {
    const token = await newAgencyToken('validation');

    const noItems = await call('/invoices', {
      method: 'POST',
      token,
      body: JSON.stringify({ buyerName: 'شركة', items: [] }),
    });
    assert.equal(noItems.status, 400);
    assert.ok(noItems.body.message.some((message) => /بنداً واحداً/.test(message)));

    const badVat = await createInvoice(token, { buyerVatNumber: '123' });
    assert.equal(badVat.status, 400);
    assert.ok(badVat.body.message.some((message) => /15 رقماً/.test(message)));
  });
});

describe('Invoices — issuance, QR and hash chain', () => {
  it('issues with a sequential number, UUID, ZATCA QR and hash', async () => {
    const token = await newAgencyToken('issue');
    const draft = await createInvoice(token);

    const issued = await call(`/invoices/${draft.body.id}/issue`, {
      method: 'POST',
      token,
    });
    assert.equal(issued.status, 201, JSON.stringify(issued.body));

    const invoice = issued.body.invoice;
    assert.equal(invoice.status, 'ISSUED');
    assert.match(invoice.invoiceNumber, /^INV-\d{4}-0001$/);
    assert.match(invoice.uuid, /^[0-9a-f-]{36}$/);
    assert.ok(invoice.issuedAt);
    assert.equal(invoice.previousHash, null);
    assert.equal(invoice.zatcaHash.length, 44); // base64 SHA-256

    const qr = await call(`/invoices/${invoice.id}/qr`, { token });
    assert.equal(qr.status, 200);
    const fields = Object.fromEntries(
      qr.body.fields.map((field) => [field.tag, field.value]),
    );
    assert.deepEqual(Object.keys(fields).map(Number), [1, 2, 3, 4, 5]);
    assert.equal(fields[1], 'وكالة issue'); // seller name from the tenant
    assert.match(fields[2], /^\d{15}$/);
    assert.equal(fields[4], '1437.50');
    assert.equal(fields[5], '187.50');
    assert.ok(fields[3].includes('T'));

    const svg = await fetch(`${baseUrl}/invoices/${invoice.id}/qr.svg`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(svg.status, 200);
    assert.match(svg.headers.get('content-type') ?? '', /image\/svg\+xml/);
    assert.match(await svg.text(), /<svg/);
  });

  it('chains each invoice hash to the previous one', async () => {
    const token = await newAgencyToken('chain');
    const firstDraft = await createInvoice(token);
    const first = await call(`/invoices/${firstDraft.body.id}/issue`, {
      method: 'POST',
      token,
    });
    const secondDraft = await createInvoice(token, { buyerName: 'مشترٍ آخر' });
    const second = await call(`/invoices/${secondDraft.body.id}/issue`, {
      method: 'POST',
      token,
    });

    assert.equal(first.body.invoice.invoiceNumber.endsWith('-0001'), true);
    assert.equal(second.body.invoice.invoiceNumber.endsWith('-0002'), true);
    assert.equal(second.body.invoice.previousHash, first.body.invoice.zatcaHash);
    assert.notEqual(second.body.invoice.zatcaHash, first.body.invoice.zatcaHash);
  });

  it('refuses to issue twice or to issue an empty invoice', async () => {
    const token = await newAgencyToken('double');
    const draft = await createInvoice(token);
    await call(`/invoices/${draft.body.id}/issue`, { method: 'POST', token });

    const again = await call(`/invoices/${draft.body.id}/issue`, {
      method: 'POST',
      token,
    });
    assert.equal(again.status, 409);
    assert.match(again.body.message, /لا يمكن إصدار/);

    const qrBeforeIssue = await createInvoice(token);
    const qr = await call(`/invoices/${qrBeforeIssue.body.id}/qr`, { token });
    assert.equal(qr.status, 409);
  });

  it('serves deterministic UBL XML with the QR embedded', async () => {
    // Demo tenant carries the ZATCA seller identity (VAT + CR + address).
    const token = adminToken;
    const draft = await createInvoice(token, {
      buyerName: 'Rihal & Sons <Travel>',
    });
    const issued = await call(`/invoices/${draft.body.id}/issue`, {
      method: 'POST',
      token,
    });
    const invoice = issued.body.invoice;

    const response = await fetch(`${baseUrl}/invoices/${invoice.id}/xml`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /application\/xml/);
    const xml = await response.text();

    assert.match(xml, /<cbc:InvoiceTypeCode name="0100000">388<\/cbc:InvoiceTypeCode>/);
    assert.match(xml, new RegExp(`<cbc:ID>${invoice.invoiceNumber}</cbc:ID>`));
    assert.match(xml, new RegExp(`<cbc:UUID>${invoice.uuid}</cbc:UUID>`));
    assert.match(xml, /<cbc:TaxAmount currencyID="SAR">187.50<\/cbc:TaxAmount>/);
    assert.match(xml, /<cbc:PayableAmount currencyID="SAR">1437.50<\/cbc:PayableAmount>/);
    assert.match(xml, /<cbc:CompanyID>310123456700003<\/cbc:CompanyID>/);
    assert.ok(xml.includes(invoice.zatcaQr));
    // XML escaping for the buyer name
    assert.match(xml, /Rihal &amp; Sons &lt;Travel&gt;/);
    assert.doesNotMatch(xml, /<Travel>/);
  });
});

describe('Invoices — lifecycle, permissions & isolation', () => {
  it('pays issued invoices and blocks invalid transitions', async () => {
    const token = await newAgencyToken('pay');
    const draft = await createInvoice(token);

    const payDraft = await call(`/invoices/${draft.body.id}/pay`, {
      method: 'POST',
      token,
    });
    assert.equal(payDraft.status, 409);

    await call(`/invoices/${draft.body.id}/issue`, { method: 'POST', token });
    const paid = await call(`/invoices/${draft.body.id}/pay`, {
      method: 'POST',
      token,
    });
    assert.equal(paid.status, 201);
    assert.equal(paid.body.status, 'PAID');
    assert.ok(paid.body.paidAt);

    const cancelPaid = await call(`/invoices/${draft.body.id}/cancel`, {
      method: 'POST',
      token,
    });
    assert.equal(cancelPaid.status, 409);
  });

  it('cancels issued invoices, keeps them listed, and blocks deletion', async () => {
    const token = await newAgencyToken('cancel');
    const draft = await createInvoice(token);
    await call(`/invoices/${draft.body.id}/issue`, { method: 'POST', token });

    const cancelled = await call(`/invoices/${draft.body.id}/cancel`, {
      method: 'POST',
      token,
    });
    assert.equal(cancelled.status, 201);
    assert.equal(cancelled.body.status, 'CANCELLED');

    const listed = await call('/invoices', { token });
    const cancelledRow = listed.body.items.find(
      (invoice) => invoice.id === draft.body.id,
    );
    assert.equal(cancelledRow.status, 'CANCELLED');

    // A cancelled invoice stays for the tax record; it can still be removed.
    const removed = await call(`/invoices/${draft.body.id}`, {
      method: 'DELETE',
      token,
    });
    assert.equal(removed.status, 204);

    // But an ISSUED invoice is immutable and cannot be deleted.
    const issuedDraft = await createInvoice(token);
    await call(`/invoices/${issuedDraft.body.id}/issue`, { method: 'POST', token });
    const removeIssued = await call(`/invoices/${issuedDraft.body.id}`, {
      method: 'DELETE',
      token,
    });
    assert.equal(removeIssued.status, 409);
  });

  it('enforces role permissions', async () => {
    const createViewer = await createInvoice(viewerToken);
    assert.equal(createViewer.status, 403);

    const token = await newAgencyToken('roles');
    const draft = await createInvoice(token);
    const supervisorIssue = await call(`/invoices/${draft.body.id}/issue`, {
      method: 'POST',
      token: supervisorToken,
    });
    assert.equal(supervisorIssue.status, 403);

    const listViewer = await call('/invoices', { token: viewerToken });
    assert.equal(listViewer.status, 200);
    assert.equal(listViewer.body.summary !== undefined, true);

    const issued = await call(`/invoices/${draft.body.id}/issue`, {
      method: 'POST',
      token,
    });
    const supervisorCancel = await call(`/invoices/${issued.body.invoice.id}/cancel`, {
      method: 'POST',
      token: supervisorToken,
    });
    assert.equal(supervisorCancel.status, 403);
  });

  it('isolates invoices per tenant', async () => {
    const ownerToken = await newAgencyToken('owner');
    const draft = await createInvoice(ownerToken);
    const rivalToken = await newAgencyToken('rival');

    const rivalRead = await call(`/invoices/${draft.body.id}`, {
      token: rivalToken,
    });
    assert.equal(rivalRead.status, 404);

    const rivalList = await call('/invoices', { token: rivalToken });
    assert.equal(rivalList.body.total, 0);

    const spoofed = await call(`/invoices/${draft.body.id}`, {
      token: rivalToken,
      headers: { 'x-tenant-id': 'tenant_demo' },
    });
    assert.equal(spoofed.status, 404);
  });

  it('lets an ADMIN set the ZATCA seller identity used in the QR', async () => {
    const token = await newAgencyToken('seller');

    const invalid = await call('/tenant', {
      method: 'PATCH',
      token,
      body: JSON.stringify({ vatNumber: '123' }),
    });
    assert.equal(invalid.status, 400);

    const forbidden = await call('/tenant', {
      method: 'PATCH',
      token: viewerToken,
      body: JSON.stringify({ vatNumber: '300000000000003' }),
    });
    assert.equal(forbidden.status, 403);

    const updated = await call('/tenant', {
      method: 'PATCH',
      token,
      body: JSON.stringify({
        name: 'وكالة الأفق',
        vatNumber: '311111111100003',
        crNumber: '1010999888',
        city: 'جدة',
      }),
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.vatNumber, '311111111100003');

    const draft = await createInvoice(token);
    const issued = await call(`/invoices/${draft.body.id}/issue`, {
      method: 'POST',
      token,
    });
    const qr = await call(`/invoices/${issued.body.invoice.id}/qr`, { token });
    const fields = Object.fromEntries(
      qr.body.fields.map((field) => [field.tag, field.value]),
    );
    assert.equal(fields[1], 'وكالة الأفق');
    assert.equal(fields[2], '311111111100003');

    const me = await call('/tenant', { token });
    assert.equal(me.body.slug.startsWith('billing-seller'), true);
  });

  it('reports billing stats and filtering', async () => {
    const token = await newAgencyToken('stats');
    const first = await createInvoice(token);
    const second = await createInvoice(token);
    await call(`/invoices/${first.body.id}/issue`, { method: 'POST', token });
    await call(`/invoices/${first.body.id}/pay`, { method: 'POST', token });
    await call(`/invoices/${second.body.id}/issue`, { method: 'POST', token });

    const stats = await call('/invoices/stats', { token });
    assert.equal(stats.status, 200);
    assert.equal(stats.body.total, 2);
    assert.equal(stats.body.byStatus.PAID, 1);
    assert.equal(stats.body.byStatus.ISSUED, 1);
    assert.equal(stats.body.paidAmount, 1437.5);
    assert.equal(stats.body.issuedAmount, 1437.5);
    assert.equal(stats.body.vatCollected, 375);

    const issuedOnly = await call('/invoices?status=ISSUED', { token });
    assert.equal(issuedOnly.body.total, 1);
    assert.equal(issuedOnly.body.items[0].status, 'ISSUED');
  });
});
