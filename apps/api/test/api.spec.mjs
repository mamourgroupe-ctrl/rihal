import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.PERSISTENCE = 'memory';
process.env.JWT_SECRET = 'test-secret-for-rihal-e2e';

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
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

async function login(email, password = 'Rihal@2026', tenantSlug) {
  return call('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, ...(tenantSlug ? { tenantSlug } : {}) }),
  });
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

  const admin = await login('admin@rihal.demo');
  assert.equal(admin.status, 200, JSON.stringify(admin.body));
  adminToken = admin.body.accessToken;

  const viewer = await login('viewer@rihal.demo');
  assert.equal(viewer.status, 200);
  viewerToken = viewer.body.accessToken;

  const supervisor = await login('supervisor@rihal.demo');
  assert.equal(supervisor.status, 200);
  supervisorToken = supervisor.body.accessToken;
});

after(async () => {
  await app.close();
});

describe('Rihal API — public surface', () => {
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

  it('rejects unauthenticated access to business routes', async () => {
    const pilgrims = await call('/pilgrims');
    assert.equal(pilgrims.status, 401);

    const dashboard = await call('/dashboard');
    assert.equal(dashboard.status, 401);
  });
});

describe('Rihal API — authentication', () => {
  it('signs in a demo admin and never leaks the password hash', async () => {
    const { status, body } = await login('admin@rihal.demo');
    assert.equal(status, 200);
    assert.equal(body.tokenType, 'Bearer');
    assert.ok(body.accessToken.length > 40);
    assert.equal(body.user.role, 'ADMIN');
    assert.equal(body.tenant.slug, 'demo');
    assert.equal(body.user.passwordHash, undefined);
  });

  it('rejects a wrong password with a generic message', async () => {
    const { status, body } = await login('admin@rihal.demo', 'WrongPass123');
    assert.equal(status, 401);
    assert.match(body.message, /غير صحيحة/);
  });

  it('returns the current identity and tenant', async () => {
    const { status, body } = await call('/auth/me', { token: adminToken });
    assert.equal(status, 200);
    assert.equal(body.user.email, 'admin@rihal.demo');
    assert.equal(body.tenant.slug, 'demo');
  });

  it('lets an admin list tenant members, and blocks other roles', async () => {
    const admin = await call('/auth/users', { token: adminToken });
    assert.equal(admin.status, 200);
    assert.ok(admin.body.length >= 4);
    assert.ok(admin.body.every((user) => user.passwordHash === undefined));

    const viewer = await call('/auth/users', { token: viewerToken });
    assert.equal(viewer.status, 403);
  });

  it('registers a new agency with its own isolated tenant', async () => {
    const suffix = Date.now().toString(36);
    const registration = await call('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        agencyName: 'وكالة الأمانة',
        slug: `amana-${suffix}`,
        name: 'مدير الأمانة',
        email: `admin-${suffix}@amana.demo`,
        password: 'Amana2026',
      }),
    });
    assert.equal(registration.status, 201, JSON.stringify(registration.body));
    assert.equal(registration.body.user.role, 'ADMIN');
    assert.notEqual(registration.body.tenant.id, 'tenant_demo');

    const newToken = registration.body.accessToken;
    const pilgrims = await call('/pilgrims', { token: newToken });
    assert.equal(pilgrims.status, 200);
    assert.equal(pilgrims.body.total, 0);

    // A request header can no longer select another tenant.
    const spoofed = await call('/pilgrims', {
      token: newToken,
      headers: { 'x-tenant-id': 'tenant_demo' },
    });
    assert.equal(spoofed.body.total, 0);

    const duplicateSlug = await call('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        agencyName: 'وكالة أخرى',
        slug: `amana-${suffix}`,
        name: 'مدير آخر',
        email: `other-${suffix}@amana.demo`,
        password: 'Amana2026',
      }),
    });
    assert.equal(duplicateSlug.status, 409);
  });
});

describe('Rihal API — pilgrims', () => {
  it('lists seeded pilgrims with pagination metadata', async () => {
    const { status, body } = await call('/pilgrims?limit=5', { token: adminToken });
    assert.equal(status, 200);
    assert.equal(body.limit, 5);
    assert.equal(body.page, 1);
    assert.ok(body.total >= 12);
    assert.equal(body.items.length, 5);
  });

  it('searches by Arabic name and by passport number', async () => {
    const byName = await call('/pilgrims?search=' + encodeURIComponent('فاطمة'), {
      token: adminToken,
    });
    assert.equal(byName.body.total, 1);
    assert.equal(byName.body.items[0].passportNumber, 'A2345678');

    const byPassport = await call('/pilgrims?search=A1234567', { token: adminToken });
    assert.equal(byPassport.body.total, 1);
  });

  it('filters by status and rejects unknown statuses', async () => {
    const filtered = await call('/pilgrims?status=READY_FOR_BOOKING', {
      token: adminToken,
    });
    assert.equal(filtered.status, 200);
    assert.ok(filtered.body.total >= 2);
    for (const pilgrim of filtered.body.items) {
      assert.equal(pilgrim.status, 'READY_FOR_BOOKING');
    }

    const invalid = await call('/pilgrims?status=NOPE', { token: adminToken });
    assert.equal(invalid.status, 400);
  });

  it('validates payloads and returns Arabic messages', async () => {
    const { status, body } = await call('/pilgrims', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ fullNameAr: 'أ', passportNumber: '12' }),
    });
    assert.equal(status, 400);
    assert.ok(Array.isArray(body.message));
    assert.ok(body.message.some((message) => /الاسم/.test(message)));
  });

  it('creates, updates and deletes a pilgrim (ADMIN)', async () => {
    const created = await call('/pilgrims', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify(samplePilgrim),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.status, 'DRAFT');
    assert.equal(created.body.tenantId, 'tenant_demo');
    const id = created.body.id;

    const fetched = await call(`/pilgrims/${id}`, { token: adminToken });
    assert.equal(fetched.status, 200);
    assert.equal(fetched.body.fullNameAr, samplePilgrim.fullNameAr);

    const updated = await call(`/pilgrims/${id}`, {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({ status: 'BOOKED', phone: '+966511111111' }),
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.status, 'BOOKED');
    assert.equal(updated.body.phone, '+966511111111');

    const deleted = await call(`/pilgrims/${id}`, { method: 'DELETE', token: adminToken });
    assert.equal(deleted.status, 204);

    const missing = await call(`/pilgrims/${id}`, { token: adminToken });
    assert.equal(missing.status, 404);
  });

  it('rejects duplicate passports inside the same tenant', async () => {
    const created = await call('/pilgrims', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ ...samplePilgrim, passportNumber: 'DUP12345' }),
    });
    assert.equal(created.status, 201);

    const duplicate = await call('/pilgrims', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ ...samplePilgrim, passportNumber: 'DUP12345' }),
    });
    assert.equal(duplicate.status, 409);
    assert.match(duplicate.body.message, /مسجّل مسبقاً/);

    await call(`/pilgrims/${created.body.id}`, { method: 'DELETE', token: adminToken });
  });

  it('enforces role permissions (VIEWER read-only, SUPERVISOR no delete)', async () => {
    const read = await call('/pilgrims?limit=1', { token: viewerToken });
    assert.equal(read.status, 200);

    const viewerWrite = await call('/pilgrims', {
      method: 'POST',
      token: viewerToken,
      body: JSON.stringify({ ...samplePilgrim, passportNumber: 'VIEW1234' }),
    });
    assert.equal(viewerWrite.status, 403);

    const supervisorWrite = await call('/pilgrims', {
      method: 'POST',
      token: supervisorToken,
      body: JSON.stringify({ ...samplePilgrim, passportNumber: 'SUP12345' }),
    });
    assert.equal(supervisorWrite.status, 201);
    const createdId = supervisorWrite.body.id;

    const supervisorDelete = await call(`/pilgrims/${createdId}`, {
      method: 'DELETE',
      token: supervisorToken,
    });
    assert.equal(supervisorDelete.status, 403);

    const adminDelete = await call(`/pilgrims/${createdId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(adminDelete.status, 204);
  });
});

describe('Rihal API — groups & dashboard', () => {
  it('manages groups and their members', async () => {
    const pilgrims = await call('/pilgrims?limit=2', { token: adminToken });
    const [first, second] = pilgrims.body.items;

    const group = await call('/groups', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ name: 'مجموعة الاختبار', maxSize: 2 }),
    });
    assert.equal(group.status, 201);
    const groupId = group.body.id;

    const added = await call(`/groups/${groupId}/members`, {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ pilgrimId: first.id, isLeader: true }),
    });
    assert.equal(added.status, 201);
    assert.equal(added.body.members.length, 1);
    assert.equal(added.body.members[0].isLeader, true);

    const duplicate = await call(`/groups/${groupId}/members`, {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ pilgrimId: first.id }),
    });
    assert.equal(duplicate.status, 409);

    const secondMember = await call(`/groups/${groupId}/members`, {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ pilgrimId: second.id }),
    });
    assert.equal(secondMember.body.members.length, 2);

    const removed = await call(`/groups/${groupId}/members/${first.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(removed.status, 200);
    assert.equal(removed.body.members.length, 1);

    const deleted = await call(`/groups/${groupId}`, { method: 'DELETE', token: adminToken });
    assert.equal(deleted.status, 204);
  });

  it('exposes dashboard KPIs scoped to the tenant', async () => {
    const { status, body } = await call('/dashboard', { token: adminToken });
    assert.equal(status, 200);
    assert.ok(body.pilgrims.total >= 12);
    assert.equal(
      Object.values(body.pilgrims.byStatus).reduce((sum, value) => sum + value, 0),
      body.pilgrims.total,
    );
    assert.ok(body.groups.total >= 4);
  });
});
