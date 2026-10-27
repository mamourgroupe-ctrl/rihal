import type { GroupStatus, InvoiceStatus, PilgrimStatus } from '@rihal/database';
import { describe, expect, it } from 'vitest';
import { DomainRuleError } from '../src/domain/domain.errors';
import {
  assertGroupTransition,
  assertInvoiceTransition,
  assertPilgrimTransition,
} from '../src/domain/status-transitions';

describe('domain state transitions', () => {
  it('allows only forward pilgrim lifecycle transitions', () => {
    expect(() =>
      assertPilgrimTransition('DRAFT' as PilgrimStatus, 'REGISTERED' as PilgrimStatus),
    ).not.toThrow();
    expect(() =>
      assertPilgrimTransition('COMPLETED' as PilgrimStatus, 'BOOKED' as PilgrimStatus),
    ).toThrow(DomainRuleError);
  });

  it('does not allow a group to skip required states or leave a terminal state', () => {
    expect(() => assertGroupTransition('DRAFT' as GroupStatus, 'READY' as GroupStatus)).not.toThrow();
    expect(() =>
      assertGroupTransition('DRAFT' as GroupStatus, 'CONFIRMED' as GroupStatus),
    ).toThrow(DomainRuleError);
    expect(() =>
      assertGroupTransition('CANCELLED' as GroupStatus, 'READY' as GroupStatus),
    ).toThrow(DomainRuleError);
  });

  it('prevents invoices from being paid before issue or reopened after payment', () => {
    expect(() =>
      assertInvoiceTransition('DRAFT' as InvoiceStatus, 'PAID' as InvoiceStatus),
    ).toThrow(DomainRuleError);
    expect(() =>
      assertInvoiceTransition('ISSUED' as InvoiceStatus, 'PAID' as InvoiceStatus),
    ).not.toThrow();
    expect(() =>
      assertInvoiceTransition('PAID' as InvoiceStatus, 'ISSUED' as InvoiceStatus),
    ).toThrow(DomainRuleError);
  });
});
