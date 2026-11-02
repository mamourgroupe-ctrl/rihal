/**
 * Development helper: gives a seeded demo user a real password so the API can
 * be exercised end to end (`POST /api/auth/login`).
 *
 * Usage (from the repository root):
 *   DEMO_PASSWORD='...' pnpm --filter @rihal/database db:demo-user
 *
 * Runs with the migration role because RLS requires an explicit tenant context
 * and the runtime role may not update password hashes on its own.
 */
import { hash } from 'bcryptjs';
import { createPrismaClient } from '../src/client';

const email = process.env.DEMO_EMAIL ?? 'admin@north.seed.invalid';
const password = process.env.DEMO_PASSWORD ?? 'Rihal-Demo-2026!';
const tenantSlug = process.env.DEMO_TENANT_SLUG ?? 'seed-agency-north';
const connectionUrl = process.env.SEED_DATABASE_URL ?? process.env.DIRECT_URL;

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to set demo credentials in production.');
}
if (password.length < 12) {
  throw new Error('DEMO_PASSWORD must be at least 12 characters long.');
}

const prisma = createPrismaClient({ ...(connectionUrl ? { url: connectionUrl } : {}), log: ['error'] });

async function main(): Promise<void> {
  const passwordHash = await hash(password, 12);

  const updated = await prisma.$transaction(async (transaction) => {
    const tenant = await transaction.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      throw new Error(`Tenant "${tenantSlug}" was not found; run "pnpm db:seed" first.`);
    }

    await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenant.id}, true)`;

    const user = await transaction.user.findFirst({
      where: { tenantId: tenant.id, email },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    if (!user) {
      throw new Error(`User "${email}" was not found in tenant "${tenantSlug}".`);
    }

    await transaction.user.update({
      where: { id: user.id },
      data: { passwordHash, isActive: true, archivedAt: null },
    });
    // A credential change must invalidate any existing session.
    await transaction.authSession.updateMany({
      where: { tenantId: tenant.id, userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { tenantSlug, ...user };
  });

  console.info(`Demo credentials ready for ${updated.email} (tenant: ${updated.tenantSlug}, role: ${updated.role}).`);
  console.info(`Password: ${password}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Failed to prepare demo credentials.');
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
