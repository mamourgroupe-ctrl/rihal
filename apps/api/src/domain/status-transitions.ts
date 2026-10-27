import type { GroupStatus, InvoiceStatus, PilgrimStatus } from '@rihal/database';
import { DomainRuleError } from './domain.errors';

const pilgrimTransitions: Record<PilgrimStatus, readonly PilgrimStatus[]> = {
  DRAFT: ['REGISTERED', 'CANCELLED'],
  REGISTERED: ['DOCUMENTS_UPLOADED', 'CANCELLED'],
  DOCUMENTS_UPLOADED: ['READY_FOR_BOOKING', 'CANCELLED'],
  READY_FOR_BOOKING: ['BOOKED', 'CANCELLED'],
  BOOKED: ['PERMIT_ISSUED', 'CANCELLED'],
  PERMIT_ISSUED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

const groupTransitions: Record<GroupStatus, readonly GroupStatus[]> = {
  DRAFT: ['READY', 'CANCELLED'],
  READY: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const invoiceTransitions: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  DRAFT: ['ISSUED', 'CANCELLED'],
  ISSUED: ['PAID', 'OVERDUE', 'CANCELLED'],
  PAID: [],
  OVERDUE: ['PAID', 'CANCELLED'],
  CANCELLED: [],
};

export function assertPilgrimTransition(
  current: PilgrimStatus,
  next: PilgrimStatus,
): void {
  assertTransition('Pilgrim', current, next, pilgrimTransitions);
}

export function assertGroupTransition(
  current: GroupStatus,
  next: GroupStatus,
): void {
  assertTransition('Group', current, next, groupTransitions);
}

export function assertInvoiceTransition(
  current: InvoiceStatus,
  next: InvoiceStatus,
): void {
  assertTransition('Invoice', current, next, invoiceTransitions);
}

function assertTransition<T extends string>(
  entityName: string,
  current: T,
  next: T,
  transitions: Readonly<Record<T, readonly T[]>>,
): void {
  if (!transitions[current].includes(next)) {
    throw new DomainRuleError(
      'INVALID_STATE_TRANSITION',
      `${entityName} cannot transition from ${current} to ${next}.`,
    );
  }
}
