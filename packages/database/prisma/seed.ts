import { Gender, PrismaClient, Role, TenantStatus } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });
const seedOnlyPasswordSentinel = 'NOT_A_REAL_PASSWORD_HASH';

const seedAgencies = [
  {
    name: 'وكالة رحّال التجريبية — الشمال',
    slug: 'seed-agency-north',
    code: 'NORTH',
    users: [
      { email: 'admin@north.seed.invalid', name: 'مسؤول تجريبي شمال', role: Role.ADMIN },
      { email: 'operator@north.seed.invalid', name: 'مشغّل تجريبي شمال', role: Role.OPERATOR },
    ],
    pilgrims: [
      { passportNumber: 'SEED-NORTH-001', fullNameAr: 'معتمر تجريبي شمال ١', fullNameEn: 'Seed Pilgrim North One' },
      { passportNumber: 'SEED-NORTH-002', fullNameAr: 'معتمر تجريبي شمال ٢', fullNameEn: 'Seed Pilgrim North Two' },
    ],
  },
  {
    name: 'وكالة رحّال التجريبية — الجنوب',
    slug: 'seed-agency-south',
    code: 'SOUTH',
    users: [
      { email: 'supervisor@south.seed.invalid', name: 'مشرف تجريبي جنوب', role: Role.SUPERVISOR },
      { email: 'viewer@south.seed.invalid', name: 'قارئ تجريبي جنوب', role: Role.VIEWER },
    ],
    pilgrims: [
      { passportNumber: 'SEED-SOUTH-001', fullNameAr: 'معتمر تجريبي جنوب ١', fullNameEn: 'Seed Pilgrim South One' },
      { passportNumber: 'SEED-SOUTH-002', fullNameAr: 'معتمر تجريبي جنوب ٢', fullNameEn: 'Seed Pilgrim South Two' },
    ],
  },
] as const;

async function seed(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const agency of seedAgencies) {
      const tenant = await tx.tenant.upsert({
        where: { slug: agency.slug },
        create: { name: agency.name, slug: agency.slug },
        update: { name: agency.name, status: TenantStatus.ACTIVE, archivedAt: null },
      });

      for (const user of agency.users) {
        await tx.user.upsert({
          where: { tenantId_email: { tenantId: tenant.id, email: user.email } },
          create: {
            tenantId: tenant.id,
            email: user.email,
            name: user.name,
            role: user.role,
            passwordHash: seedOnlyPasswordSentinel,
          },
          // Never replace an existing password hash when rerunning the seed.
          update: { name: user.name, role: user.role, isActive: true, archivedAt: null },
        });
      }

      const pilgrims: Array<{ id: string }> = [];
      for (const [index, pilgrim] of agency.pilgrims.entries()) {
        const savedPilgrim = await tx.pilgrim.upsert({
          where: {
            tenantId_passportNumber: {
              tenantId: tenant.id,
              passportNumber: pilgrim.passportNumber,
            },
          },
          create: {
            tenantId: tenant.id,
            passportNumber: pilgrim.passportNumber,
            fullNameAr: pilgrim.fullNameAr,
            fullNameEn: pilgrim.fullNameEn,
            passportExpiry: new Date('2035-01-01T00:00:00.000Z'),
            nationality: 'DZ',
            gender: index === 0 ? Gender.FEMALE : Gender.MALE,
            status: 'REGISTERED',
          },
          update: {
            fullNameAr: pilgrim.fullNameAr,
            fullNameEn: pilgrim.fullNameEn,
            archivedAt: null,
          },
        });
        pilgrims.push(savedPilgrim);
      }

      let group = await tx.group.findFirst({
        where: { tenantId: tenant.id, name: `مجموعة تجريبية ${agency.code}`, archivedAt: null },
      });
      if (!group) {
        group = await tx.group.create({
          data: {
            tenantId: tenant.id,
            name: `مجموعة تجريبية ${agency.code}`,
            maxSize: 4,
          },
        });
      }

      for (const [index, pilgrim] of pilgrims.entries()) {
        const existingMember = await tx.groupMember.findFirst({
          where: {
            tenantId: tenant.id,
            groupId: group.id,
            pilgrimId: pilgrim.id,
            archivedAt: null,
          },
        });
        if (existingMember) {
          await tx.groupMember.update({
            where: { id: existingMember.id },
            data: { isLeader: index === 0 },
          });
        } else {
          await tx.groupMember.create({
            data: {
              tenantId: tenant.id,
              groupId: group.id,
              pilgrimId: pilgrim.id,
              isLeader: index === 0,
            },
          });
        }
      }
    }
  });

  console.info('Seed complete: 2 demo tenants, 4 users, 4 pilgrims, 2 groups, and 4 memberships.');
}

seed()
  .catch(() => {
    // Avoid printing query parameters or personal data if a database operation fails.
    console.error('Database seed failed. Check the database connection and migration status.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
