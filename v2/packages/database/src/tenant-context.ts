import type { Prisma } from '../generated/client';

// CUIDs, UUIDs, and synthetic test IDs. Tenant IDs are opaque identifiers, not names.
const TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function assertTenantId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.trim() !== value || !TENANT_ID_PATTERN.test(value)) {
    throw new TypeError('Tenant ID must be a 1–128 character opaque identifier.');
  }
}

/** Must only be called inside an interactive Prisma transaction. */
export async function setLocalTenantId(
  tx: Pick<Prisma.TransactionClient, '$executeRawUnsafe'>,
  tenantId: string,
): Promise<void> {
  assertTenantId(tenantId);

  // PostgreSQL SET does not support bind parameters. Strictly allowlisting the
  // entire identifier above makes this SQL literal safe (no quotes/backslashes).
  // LOCAL is essential: the setting disappears on COMMIT AND ROLLBACK and cannot
  // bleed into another request when the pool reuses this connection.
  await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
}
