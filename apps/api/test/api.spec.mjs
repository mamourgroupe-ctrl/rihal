import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.PERSISTENCE = 'memory';

const { createApp } = await import('../dist/app.factory.js');

let app;
let baseUrl;

async function call(path, options = {}) {
  const response = await fetch(baseUrl + path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { status: response.status, body };
}

const samplePilgrim = {
  fullNameAr: 'سعد بن ناصر',
  fullNameEn: 'Saad Bin Nasser',
  passportNumber: 'X9998887',
  passportExpiry: '2029-06-01',
  nationality: 'SAU',
};

before(async () => {
  app = await createApp();
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  baseUrl = `http://127.0.0.1:${address.port}/api`;
});

after(async () => {
  await app.close();
});

describe('Rihal API', () => {
  it('reports health with the active persistence backend', async () => {
    const { status, body } = await call('/health');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.persistence.backend, 'memory');
  });

  it('serves the landing dashboard outside the API prefix', async () => {
    const response = await fetch(baseUrl.replace('/api', '/'));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    assert.match(await response.text(), /رحال/);
  });

  it('lists seeded pilgrims with pagination metadata', async () => {
    const { status, body } = await call('/pilgrims?limit=5');
    assert.equal(status, 200);
    assert.equal(body.limit, 5);
    assert.equal(body.page, 1);
    assert.ok(body.total >= 12);
    assert.equal(body.items.length, 5);
  });

  it('searches by Arabic name and by passport number', async () => {
    const byName = await call('/pilgrims?search=' + encodeURIComponent('فاطمة'));
    assert.equal(byName.body.total, 1);
    assert.equal(byName.body.items[0].passportNumber, 'A2345678');

    const byPassport = await call('/pilgrims?search=A1234567');
    assert.equal(byPassport.body.total, 1);
  });

  it('filters by status and rejects unknown statuses', async () => {
    const filtered = await call('/pilgrims?status=READY_FOR_BOOKING');
    assert.equal(filtered.status, 200);
    assert.ok(filtered.body.total >= 2);
    for (const pilgrim of filtered.body.items) {
      assert.equal(pilgrim.status, 'READY_FOR_BOOKING');
    }

    const invalid = await call('/pilgrims?status=NOPE');
    assert.equal(invalid.status, 400);
  });

  it('validates payloads and returns Arabic messages', async () => {
    const { status, body } = await call('/pilgrims', {
      method: 'POST',
      body: JSON.stringify({ fullNameAr: 'أ', passportNumber: '12' }),
    });
    assert.equal(status, 400);
    assert.ok(Array.isArray(body.message));
    assert.ok(body.message.some((message) => /الاسم/.test(message)));
  });

  it('creates, updates and deletes a pilgrim', async () => {
    const created = await call('/pilgrims', {
      method: 'POST',
      body: JSON.stringify(samplePilgrim),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.status, 'DRAFT');
    assert.equal(created.body.tenantId, 'tenant_demo');
    const id = created.body.id;

    const fetched = await call(`/pilgrims/${id}`);
    assert.equal(fetched.status, 200);
    assert.equal(fetched.body.fullNameAr, samplePilgrim.fullNameAr);

    const updated = await call(`/pilgrims/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'BOOKED', phone: '+966511111111' }),
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.status, 'BOOKED');
    assert.equal(updated.body.phone, '+966511111111');

    const deleted = await call(`/pilgrims/${id}`, { method: 'DELETE' });
    assert.equal(deleted.status, 204);

    const missing = await call(`/pilgrims/${id}`);
    assert.equal(missing.status, 404);
  });

  it('rejects duplicate passports inside the same tenant', async () => {
    const created = await call('/pilgrims', {
      method: 'POST',
      body: JSON.stringify({ ...samplePilgrim, passportNumber: 'DUP12345' }),
    });
    assert.equal(created.status, 201);

    const duplicate = await call('/pilgrims', {
      method: 'POST',
      body: JSON.stringify({ ...samplePilgrim, passportNumber: 'DUP12345' }),
    });
    assert.equal(duplicate.status, 409);
    assert.match(duplicate.body.message, /مسجّل مسبقاً/);

    await call(`/pilgrims/${created.body.id}`, { method: 'DELETE' });
  });

  it('isolates tenants using the x-tenant-id header', async () => {
    const other = await call('/pilgrims', { headers: { 'x-tenant-id': 'tenant_other' } });
    assert.equal(other.status, 200);
    assert.equal(other.body.total, 0);

    const invalid = await call('/pilgrims', { headers: { 'x-tenant-id': 'ab!' } });
    assert.equal(invalid.status, 401);
  });

  it('manages groups and their members', async () => {
    const pilgrims = await call('/pilgrims?limit=2');
    const [first, second] = pilgrims.body.items;

    const group = await call('/groups', {
      method: 'POST',
      body: JSON.stringify({ name: 'مجموعة الاختبار', maxSize: 2 }),
    });
    assert.equal(group.status, 201);
    assert.equal(group.body.status, 'DRAFT');
    const groupId = group.body.id;

    const added = await call(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ pilgrimId: first.id, isLeader: true }),
    });
    assert.equal(added.status, 201);
    assert.equal(added.body.members.length, 1);
    assert.equal(added.body.members[0].isLeader, true);

    const duplicate = await call(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ pilgrimId: first.id }),
    });
    assert.equal(duplicate.status, 409);

    const secondMember = await call(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ pilgrimId: second.id }),
    });
    assert.equal(secondMember.body.members.length, 2);

    const full = await call(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ pilgrimId: 'pil_unknown' }),
    });
    assert.ok([404, 409].includes(full.status));

    const removed = await call(`/groups/${groupId}/members/${first.id}`, {
      method: 'DELETE',
    });
    assert.equal(removed.status, 200);
    assert.equal(removed.body.members.length, 1);

    const deleted = await call(`/groups/${groupId}`, { method: 'DELETE' });
    assert.equal(deleted.status, 204);
  });

  it('exposes dashboard KPIs scoped to the tenant', async () => {
    const { status, body } = await call('/dashboard');
    assert.equal(status, 200);
    assert.ok(body.pilgrims.total >= 12);
    assert.equal(
      Object.values(body.pilgrims.byStatus).reduce((sum, value) => sum + value, 0),
      body.pilgrims.total,
    );
    assert.ok(body.groups.total >= 4);
  });
});
