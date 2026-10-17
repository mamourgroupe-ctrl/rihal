import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { after, before, describe, it } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.PERSISTENCE = 'memory';
process.env.JWT_SECRET = 'test-secret-for-rihal-documents';
process.env.MAX_UPLOAD_MB = '2';
// Keep e2e uploads out of the repository working tree.
process.env.UPLOAD_DIR = `${tmpdir()}/rihal-test-uploads-${process.pid}`;

const { createApp } = await import('../dist/app.factory.js');

// Valid TD3 MRZ generated with correct ICAO check digits:
//   passport A12345678 · SAU · DOB 1990-02-15 · M · expiry 2031-08-20
const MRZ_LINE_1 = 'P<SAUALOTAIBI<<ABDULLAH<MOHAMMED<<<<<<<<<<<<';
const MRZ_LINE_2 = 'A123456784SAU9002155M31082061234567890123454';
const MRZ = `${MRZ_LINE_1}\n${MRZ_LINE_2}`;

// 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let app;
let baseUrl;
let adminToken;
let viewerToken;

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
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function uploadDocument(path, token, { buffer, filename, mimeType, type, ocrText }) {
  const form = new FormData();
  if (type) form.append('type', type);
  if (ocrText) form.append('ocrText', ocrText);
  form.append('file', new Blob([buffer], { type: mimeType }), filename);

  const response = await fetch(baseUrl + path, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function login(email, password = 'Rihal@2026') {
  return call('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

async function newAgencyToken(label) {
  const suffix = `${label}${Date.now().toString(36)}`;
  const registration = await call('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      agencyName: `وكالة ${label}`,
      slug: `agency-${suffix}`,
      name: `مدير ${label}`,
      email: `admin-${suffix}@agency.demo`,
      password: 'Agency2026',
    }),
  });
  assert.equal(registration.status, 201, JSON.stringify(registration.body));
  return registration.body.accessToken;
}

async function createPilgrim(token, overrides) {
  const { body } = await call('/pilgrims', {
    method: 'POST',
    token,
    body: JSON.stringify({
      fullNameAr: 'عبدالله محمد العتيبي',
      fullNameEn: 'Abdullah Mohammed Alotaibi',
      passportNumber: 'A12345678',
      passportExpiry: '2031-08-20',
      nationality: 'SAU',
      dateOfBirth: '1990-02-15',
      gender: 'MALE',
      ...overrides,
    }),
  });
  return body;
}

before(async () => {
  app = await createApp();
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  baseUrl = `http://127.0.0.1:${address.port}/api`;

  adminToken = (await login('admin@rihal.demo')).body.accessToken;
  viewerToken = (await login('viewer@rihal.demo')).body.accessToken;
});

after(async () => {
  await app.close();
  rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
});

describe('Documents — upload & readiness', () => {
  it('parse the MRZ, validates check digits and matches the pilgrim record', async () => {
    const token = await newAgencyToken('match');
    const pilgrim = await createPilgrim(token);

    const result = await uploadDocument('/pilgrims/' + pilgrim.id + '/documents', token, {
      buffer: PNG,
      filename: 'passport.png',
      mimeType: 'image/png',
      type: 'PASSPORT',
      ocrText: MRZ,
    });

    assert.equal(result.status, 201, JSON.stringify(result.body));
    const document = result.body.document;
    assert.equal(document.type, 'PASSPORT');
    assert.equal(document.fileSize, PNG.length);
    assert.equal(document.verified, true);
    assert.equal(document.ocrData.source, 'mrz');
    assert.equal(document.ocrData.passportNumber, 'A12345678');
    assert.equal(document.ocrData.nationality, 'SAU');
    assert.equal(document.ocrData.dateOfBirth, '1990-02-15');
    assert.equal(document.ocrData.passportExpiry, '2031-08-20');
    assert.equal(document.ocrData.gender, 'MALE');
    assert.equal(document.ocrData.fullNameEn, 'ABDULLAH MOHAMMED ALOTAIBI');
    assert.equal(document.ocrData.checkDigitsValid, true);
    assert.deepEqual(document.ocrData.mismatches, []);

    // Files are stored under an internal key — never a public URL.
    assert.equal(document.fileUrl, undefined);
    assert.equal(result.body.readiness.complete, false);
    assert.deepEqual(result.body.readiness.missing, ['PHOTO']);

    const pilgrimAfter = await call('/pilgrims/' + pilgrim.id, { token });
    assert.equal(pilgrimAfter.body.status, 'REGISTERED');
  });

  it('flags mismatches between the MRZ and the stored pilgrim record', async () => {
    const token = await newAgencyToken('mismatch');
    const seeded = await createPilgrim(token, { passportNumber: 'G55555555' });

    const result = await uploadDocument('/pilgrims/' + seeded.id + '/documents', token, {
      buffer: PNG,
      filename: 'other-passport.png',
      mimeType: 'image/png',
      type: 'PASSPORT',
      ocrText: MRZ,
    });

    assert.equal(result.status, 201);
    assert.equal(result.body.document.verified, false);
    assert.ok(result.body.document.ocrData.mismatches.length >= 1);
    assert.ok(
      result.body.document.ocrData.mismatches.some((message) => /لا يطابق/.test(message)),
    );
  });

  it('keeps the document unverified when the MRZ cannot be parsed', async () => {
    const pilgrim = await createPilgrim(adminToken, { passportNumber: 'B99999999' });

    const result = await uploadDocument('/pilgrims/' + pilgrim.id + '/documents', adminToken, {
      buffer: PNG,
      filename: 'blurry.png',
      mimeType: 'image/png',
      type: 'PASSPORT',
      ocrText: 'not a machine readable zone',
    });

    assert.equal(result.status, 201);
    assert.equal(result.body.document.ocrData.source, 'none');
    assert.equal(result.body.document.verified, false);
  });

  it('moves the pilgrim forward and backward as documents change', async () => {
    const token = await newAgencyToken('flow');
    const pilgrim = await createPilgrim(token);

    const passport = await uploadDocument('/pilgrims/' + pilgrim.id + '/documents', token, {
      buffer: PNG,
      filename: 'passport.png',
      mimeType: 'image/png',
      type: 'PASSPORT',
      ocrText: MRZ,
    });
    assert.equal(passport.body.readiness.readyForBooking, false);

    const photo = await uploadDocument('/pilgrims/' + pilgrim.id + '/documents', token, {
      buffer: PNG,
      filename: 'photo.png',
      mimeType: 'image/png',
      type: 'PHOTO',
    });
    assert.equal(photo.status, 201);
    assert.equal(photo.body.readiness.complete, true);
    assert.equal(photo.body.readiness.readyForBooking, false);
    assert.equal(photo.body.document.verified, false);

    const statusAfterUpload = await call('/pilgrims/' + pilgrim.id, { token });
    assert.equal(statusAfterUpload.body.status, 'DOCUMENTS_UPLOADED');

    const verified = await call('/documents/' + photo.body.document.id + '/verify', {
      method: 'PATCH',
      token,
      body: JSON.stringify({ verified: true }),
    });
    assert.equal(verified.status, 200);
    assert.equal(verified.body.readiness.readyForBooking, true);

    const statusAfterVerify = await call('/pilgrims/' + pilgrim.id, { token });
    assert.equal(statusAfterVerify.body.status, 'READY_FOR_BOOKING');

    const removed = await call('/documents/' + photo.body.document.id, {
      method: 'DELETE',
      token,
    });
    assert.equal(removed.status, 200);
    assert.deepEqual(removed.body.readiness.missing, ['PHOTO']);

    const statusAfterDelete = await call('/pilgrims/' + pilgrim.id, { token });
    assert.equal(statusAfterDelete.body.status, 'REGISTERED');
  });

  it('rejects unsupported formats, empty files and oversized uploads', async () => {
    const pilgrim = await createPilgrim(adminToken, { passportNumber: 'D22222222' });

    const text = await uploadDocument('/pilgrims/' + pilgrim.id + '/documents', adminToken, {
      buffer: Buffer.from('hello'),
      filename: 'notes.txt',
      mimeType: 'text/plain',
      type: 'OTHER',
    });
    assert.equal(text.status, 400);
    assert.match(text.body.message, /صيغة الملف غير مدعومة/);

    const big = Buffer.alloc(3 * 1024 * 1024, 1);
    const oversized = await uploadDocument('/pilgrims/' + pilgrim.id + '/documents', adminToken, {
      buffer: big,
      filename: 'big.png',
      mimeType: 'image/png',
      type: 'PHOTO',
    });
    assert.equal(oversized.status, 400);
    assert.match(oversized.body.message, /يتجاوز الحد المسموح/);

    const invalidType = await uploadDocument('/pilgrims/' + pilgrim.id + '/documents', adminToken, {
      buffer: PNG,
      filename: 'photo.png',
      mimeType: 'image/png',
      type: 'PASSPORT_SCAN',
    });
    assert.equal(invalidType.status, 400);
  });

  it('serves protected downloads scoped to the owning tenant', async () => {
    const token = await newAgencyToken('download');
    const pilgrim = await createPilgrim(token);
    const uploaded = await uploadDocument('/pilgrims/' + pilgrim.id + '/documents', token, {
      buffer: PNG,
      filename: 'وثيقة الجواز.png',
      mimeType: 'image/png',
      type: 'PASSPORT',
      ocrText: MRZ,
    });
    const documentId = uploaded.body.document.id;

    const download = await fetch(`${baseUrl}/documents/${documentId}/download`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(download.status, 200);
    assert.equal(download.headers.get('content-type'), 'image/png');
    assert.match(download.headers.get('content-disposition') ?? '', /attachment/);
    const bytes = Buffer.from(await download.arrayBuffer());
    assert.equal(bytes.length, PNG.length);

    const anonymous = await fetch(`${baseUrl}/documents/${documentId}/download`);
    assert.equal(anonymous.status, 401);

    const rivalToken = await newAgencyToken('rival');

    const crossTenant = await fetch(`${baseUrl}/documents/${documentId}/download`, {
      headers: { authorization: `Bearer ${rivalToken}` },
    });
    assert.equal(crossTenant.status, 404);

    const spoofed = await fetch(`${baseUrl}/documents/${documentId}/download`, {
      headers: {
        authorization: `Bearer ${rivalToken}`,
        'x-tenant-id': 'tenant_demo',
      },
    });
    assert.equal(spoofed.status, 404);
  });

  it('enforces roles for uploads and verification', async () => {
    const pilgrim = await createPilgrim(adminToken, { passportNumber: 'F44444444' });

    const viewerUpload = await uploadDocument('/pilgrims/' + pilgrim.id + '/documents', viewerToken, {
      buffer: PNG,
      filename: 'photo.png',
      mimeType: 'image/png',
      type: 'PHOTO',
    });
    assert.equal(viewerUpload.status, 403);

    const viewerList = await call('/pilgrims/' + pilgrim.id + '/documents', {
      token: viewerToken,
    });
    assert.equal(viewerList.status, 200);
    assert.equal(viewerList.body.readiness.complete, false);

    const adminUpload = await uploadDocument('/pilgrims/' + pilgrim.id + '/documents', adminToken, {
      buffer: PNG,
      filename: 'photo.png',
      mimeType: 'image/png',
      type: 'PHOTO',
    });
    assert.equal(adminUpload.status, 201);

    const viewerVerify = await call('/documents/' + adminUpload.body.document.id + '/verify', {
      method: 'PATCH',
      token: viewerToken,
      body: JSON.stringify({ verified: true }),
    });
    assert.equal(viewerVerify.status, 403);
  });

  it('404s for documents of another pilgrim tenant and unknown ids', async () => {
    const missing = await call('/pilgrims/pil_unknown/documents', { token: adminToken });
    assert.equal(missing.status, 404);

    const unknownDocument = await call('/documents/doc_unknown', { token: adminToken });
    assert.equal(unknownDocument.status, 404);
  });
});
