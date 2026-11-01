import type { PrismaClient } from '../packages/database/src';

export const TENANT_A = 'tenant-alpha';
export const TENANT_B = 'tenant-beta';
export type FixtureTenant = typeof TENANT_A | typeof TENANT_B;

export const TENANT_TABLES = [
  'users', 'people', 'trips', 'bookings', 'groups', 'group_members',
  'documents', 'invoices', 'notifications', 'audit_logs',
] as const;
export type TenantTable = (typeof TENANT_TABLES)[number];

export function ids(tenantId: FixtureTenant) {
  const key = tenantId === TENANT_A ? 'alpha' : 'beta';
  return {
    tenantId,
    key,
    user: `user-${key}`,
    person: `person-${key}`,
    extraPerson: `person-${key}-extra`,
    trip: `trip-${key}`,
    otherTrip: `trip-${key}-other`,
    booking: `booking-${key}`,
    otherBooking: `booking-${key}-other`,
    group: `group-${key}`,
    otherGroup: `group-${key}-other`,
    member: `member-${key}`,
    document: `document-${key}`,
    invoice: `invoice-${key}`,
    notification: `notification-${key}`,
    audit: `audit-${key}`,
  };
}

const date = new Date('2027-01-01T00:00:00.000Z');

/** Data is deliberately synthetic. No addresses, passports, or real invoices. */
export async function seedPlaceholders(client: PrismaClient): Promise<void> {
  await client.$transaction(async (tx) => {
    for (const tenantId of [TENANT_A, TENANT_B] as const) {
      const f = ids(tenantId);
      await tx.tenant.create({ data: { id: tenantId, name: `Placeholder ${f.key}`, slug: `placeholder-${f.key}` } });
      await tx.user.create({ data: { id: f.user, tenantId, name: 'Synthetic Operator', email: `${f.key}@example.invalid` } });
      await tx.person.create({ data: { id: f.person, tenantId, fullName: `Synthetic Person ${f.key}` } });
      await tx.person.create({ data: { id: f.extraPerson, tenantId, fullName: `Synthetic Extra ${f.key}` } });
      for (const tripId of [f.trip, f.otherTrip]) {
        await tx.trip.create({ data: { id: tripId, tenantId, name: 'Placeholder Journey', season: 'synthetic-season', kind: 'UMRAH', startsAt: date, endsAt: date } });
      }
      await tx.booking.create({ data: { id: f.booking, tenantId, personId: f.person, tripId: f.trip, bookingReference: `placeholder-${f.key}-main` } });
      await tx.booking.create({ data: { id: f.otherBooking, tenantId, personId: f.person, tripId: f.otherTrip, bookingReference: `placeholder-${f.key}-other` } });
      await tx.group.create({ data: { id: f.group, tenantId, tripId: f.trip, name: 'Placeholder Group' } });
      await tx.group.create({ data: { id: f.otherGroup, tenantId, tripId: f.otherTrip, name: 'Placeholder Other Group' } });
      await tx.groupMember.create({ data: { id: f.member, tenantId, tripId: f.trip, groupId: f.group, bookingId: f.booking } });
      await tx.document.create({ data: { id: f.document, tenantId, personId: f.person, bookingId: f.booking, uploadedById: f.user, type: 'OTHER', storageKey: `${tenantId}/placeholder.txt`, fileName: 'placeholder.txt', mimeType: 'text/plain', fileSize: 0 } });
      await tx.invoice.create({ data: { id: f.invoice, tenantId, bookingId: f.booking, invoiceNumber: `placeholder-${f.key}`, amount: '0.00', currency: 'USD' } });
      await tx.notification.create({ data: { id: f.notification, tenantId, userId: f.user, personId: f.person, bookingId: f.booking, channel: 'IN_APP', template: 'placeholder', payload: { synthetic: true } } });
      await tx.auditLog.create({ data: { id: f.audit, tenantId, actorUserId: f.user, action: 'fixture.initialized', resource: 'Booking', resourceKey: f.booking, metadata: { synthetic: true } } });
    }
  }, { timeout: 30_000 });
}

/** Valid, non-conflicting insert values for every tenant-scoped table. */
export function insertValues(table: TenantTable, tenantId: FixtureTenant): Record<string, unknown> {
  const f = ids(tenantId);
  const common = { id: `new-${table}-${f.key}`, tenantId, updatedAt: date };
  switch (table) {
    case 'users': return { ...common, email: `new-${f.key}@example.invalid`, name: 'Synthetic New Operator' };
    case 'people': return { ...common, fullName: 'Synthetic New Person' };
    case 'trips': return { ...common, name: 'Synthetic New Journey', season: 'synthetic-season', kind: 'UMRAH', startsAt: date, endsAt: date };
    case 'bookings': return { ...common, personId: f.extraPerson, tripId: f.trip, bookingReference: `new-${f.key}` };
    case 'groups': return { ...common, tripId: f.trip, name: 'Synthetic New Group' };
    case 'group_members': return { id: common.id, tenantId, tripId: f.otherTrip, groupId: f.otherGroup, bookingId: f.otherBooking };
    case 'documents': return { ...common, personId: f.person, bookingId: f.booking, uploadedById: f.user, type: 'OTHER', storageKey: `${tenantId}/new-placeholder.txt`, fileName: 'placeholder.txt', mimeType: 'text/plain', fileSize: 0 };
    case 'invoices': return { ...common, bookingId: f.booking, invoiceNumber: `new-${f.key}`, amount: '0.00', currency: 'USD' };
    case 'notifications': return { ...common, userId: f.user, personId: f.person, bookingId: f.booking, channel: 'IN_APP', template: 'placeholder', payload: JSON.stringify({ synthetic: true }) };
    case 'audit_logs': return { id: common.id, tenantId, actorUserId: f.user, action: 'synthetic.created', resource: 'Fixture', metadata: JSON.stringify({ synthetic: true }) };
  }
}
