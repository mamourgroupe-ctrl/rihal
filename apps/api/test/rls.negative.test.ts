import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables (handles both dev and test envs)
dotenv.config({ path: join(__dirname, '../../../.env.test.local') });
dotenv.config({ path: join(__dirname, '../../../.env') });

describe('RLS Negative Tests (PostgreSQL)', () => {
  let prismaApp: PrismaClient;
  let prismaAdmin: PrismaClient;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
    
    // 1. Connection as the runtime app role (rihal_app)
    prismaApp = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });

    // 2. Connection as the admin/migrator role (rihal_migrator)
    prismaAdmin = new PrismaClient({
      datasources: { 
        db: { url: process.env.ADMIN_DATABASE_URL || process.env.TEST_ADMIN_DATABASE_URL || process.env.DIRECT_URL } 
      },
    });

    await prismaApp.$connect();
    await prismaAdmin.$connect();
  });

  afterAll(async () => {
    await prismaApp.$disconnect();
    await prismaAdmin.$disconnect();
  });

  it('rihal_app role MUST NOT have SUPERUSER or BYPASSRLS attributes', async () => {
    const res: any[] = await prismaApp.$queryRaw`
      SELECT rolsuper, rolbypassrls 
      FROM pg_roles 
      WHERE rolname = current_user
    `;
    
    expect(res.length).toBe(1);
    expect(res[0].rolsuper).toBe(false);
    expect(res[0].rolbypassrls).toBe(false);
  });

  it('rihal_app role MUST NOT be able to escalate to rihal_migrator', async () => {
    // Attempting to switch roles at the database level should throw an error
    await expect(
      prismaApp.$executeRawUnsafe(`SET ROLE rihal_migrator`)
    ).rejects.toThrow();
  });

  it('All tables with a tenant column MUST have RLS ENABLED and FORCED', async () => {
    // This query checks for any table that has a 'tenantId' or 'tenant_id' column
    // but does NOT have Row-Level Security forced on it.
    const res: any[] = await prismaAdmin.$queryRaw`
      SELECT c.relname 
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND a.attname IN ('tenantId', 'tenant_id')
        AND a.attnum > 0
        AND (c.relrowsecurity = false OR c.relforcerowsecurity = false)
    `;
    
    // If this array is not empty, it means there are tables missing RLS constraints!
    expect(res).toEqual([]);
  });
});
