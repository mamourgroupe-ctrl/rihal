import 'reflect-metadata';
import { AsyncResource } from 'node:async_hooks';
import {
  RequestTimeoutException, UnauthorizedException, type CallHandler, type ExecutionContext,
} from '@nestjs/common';
import { Client } from 'pg';
import { defer, EMPTY, lastValueFrom, NEVER, Observable, of, tap } from 'rxjs';
import { afterAll, afterEach, beforeAll, describe, expect, inject, it, vi } from 'vitest';
import { TenantInterceptor } from '../src/common/interceptors/tenant.interceptor';
import { DatabaseService } from '../src/database/database.service';
import { ids, TENANT_A, TENANT_B } from '../../../tests/fixtures';
import type { TestDatabaseConnections } from '../../../tests/database-context';

function contextFor(user: unknown, type = 'http'): ExecutionContext {
  return {
    getType: () => type,
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        // Deliberately conflicting, untrusted tenant values must be ignored.
        body: { tenantId: TENANT_B },
        query: { tenantId: TENANT_B },
        headers: { 'x-tenant-id': TENANT_B },
      }),
    }),
  } as unknown as ExecutionContext;
}

const a = ids(TENANT_A);
const b = ids(TENANT_B);
const createdIds = ['api-committed-placeholder', 'api-rolled-back-placeholder', 'api-cancelled-placeholder'];

describe('TenantInterceptor and transaction-scoped DatabaseService', () => {
  let connections: TestDatabaseConnections;
  let database: DatabaseService;
  let interceptor: TenantInterceptor;

  beforeAll(async () => {
    connections = inject('database');
    database = new DatabaseService(connections.runtimeUrl);
    await database.onModuleInit();
    interceptor = new TenantInterceptor(database);
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await database.runInTenantTransaction(TENANT_A, () => database.client.person.deleteMany({
      where: { id: { in: createdIds } },
    }));
  });

  afterAll(async () => {
    await database.onModuleDestroy();
  });

  async function request<T>(tenantId: string, action: () => Promise<T>): Promise<T> {
    const next: CallHandler = { handle: () => defer(action) };
    return lastValueFrom(interceptor.intercept(contextFor({ id: ids(tenantId === TENANT_A ? TENANT_A : TENANT_B).user, tenantId }), next)) as Promise<T>;
  }

  it('uses request.user, ignores headers/body/query, and scopes unfiltered Prisma reads', async () => {
    const result = await request(TENANT_A, async () => ({
      tenantId: database.tenantId,
      people: await database.client.person.findMany(),
    }));
    expect(result.tenantId).toBe(TENANT_A);
    expect(result.people.length).toBeGreaterThan(0);
    expect(result.people.every((person) => person.tenantId === TENANT_A)).toBe(true);
    expect(await request(TENANT_A, () => database.client.person.findUnique({ where: { id: b.person } }))).toBeNull();
  });

  it('starts lazily, uses the same scoped transaction downstream, and commits a successful request', async () => {
    const next: CallHandler = {
      handle: vi.fn(() => defer(async () => database.client.person.create({
        data: { id: createdIds[0], tenantId: database.tenantId, fullName: 'Synthetic API Person' },
      }))),
    };
    const response = interceptor.intercept(contextFor({ id: a.user, tenantId: TENANT_A }), next);
    expect(next.handle).not.toHaveBeenCalled();
    const result = await lastValueFrom(response);
    expect(result).toMatchObject({ id: createdIds[0], tenantId: TENANT_A });
    expect(next.handle).toHaveBeenCalledTimes(1);
    const persisted = await database.runInTenantTransaction(TENANT_A, () => database.client.person.findUnique({
      where: { id: createdIds[0] },
    }));
    expect(persisted).toMatchObject({ id: createdIds[0], tenantId: TENANT_A });
    expect(() => database.client).toThrow('No active tenant transaction');
  });

  it('rolls back prior writes and propagates the original handler error', async () => {
    const failure = new Error('Synthetic handler failure');
    await expect(request(TENANT_A, async () => {
      await database.client.person.create({ data: { id: createdIds[1], tenantId: TENANT_A, fullName: 'Synthetic Rollback' } });
      throw failure;
    })).rejects.toBe(failure);
    const row = await database.runInTenantTransaction(TENANT_A, () => database.client.person.findUnique({ where: { id: createdIds[1] } }));
    expect(row).toBeNull();
  });

  it('rejects a cross-tenant write through the actual request transaction', async () => {
    await expect(request(TENANT_A, () => database.client.person.create({
      data: { id: 'api-forbidden-placeholder', tenantId: TENANT_B, fullName: 'Synthetic Forbidden' },
    }))).rejects.toThrow();
    expect(await database.runInTenantTransaction(TENANT_B, () => database.client.person.findUnique({
      where: { id: 'api-forbidden-placeholder' },
    }))).toBeNull();
  });

  it('rejects a cross-tenant relationship through the actual request transaction', async () => {
    await expect(request(TENANT_A, () => database.client.booking.create({
      data: { id: 'api-cross-link-placeholder', tenantId: TENANT_A, personId: b.extraPerson, tripId: a.trip, bookingReference: 'synthetic-api-cross-link' },
    }))).rejects.toMatchObject({ code: 'P2003' });
  });

  it.each([
    undefined, null, {}, { tenantId: null }, { tenantId: '' },
    { tenantId: 123 }, { tenantId: 'tenant-alpha\n' }, { tenantId: "tenant-alpha'; RESET ROLE; --" },
  ])('rejects an absent/invalid authenticated tenant before starting work: %j', (user) => {
    const transaction = vi.spyOn(database, 'runInTenantTransaction');
    const next: CallHandler = { handle: vi.fn(() => of('placeholder')) };
    expect(() => interceptor.intercept(contextFor(user), next)).toThrow(UnauthorizedException);
    expect(transaction).not.toHaveBeenCalled();
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('rejects non-HTTP transports', () => {
    expect(() => interceptor.intercept(contextFor({ tenantId: TENANT_A }, 'rpc'), { handle: () => of('placeholder') }))
      .toThrow('finite HTTP handlers');
  });

  it('does not expose a Prisma client outside an active request transaction', () => {
    expect(() => database.client).toThrow('No active tenant transaction');
    expect(() => database.tenantId).toThrow('No active tenant transaction');
  });

  it('prevents an inner service from changing the active tenant via nested transactions', async () => {
    await expect(request(TENANT_A, () => database.runInTenantTransaction(TENANT_B, async () => null)))
      .rejects.toThrow('Nested tenant transactions');
  });

  it('invalidates an ALS context retained by detached work after commit', async () => {
    let detached: AsyncResource | undefined;
    await request(TENANT_A, async () => {
      detached = new AsyncResource('synthetic-detached-work');
      return 'placeholder';
    });
    if (!detached) throw new Error('Missing detached test resource.');
    try {
      detached.runInAsyncScope(() => {
        expect(() => database.client).toThrow('No active tenant transaction');
      });
    } finally {
      detached.emitDestroy();
    }
  });

  it('isolates concurrent requests across awaited service calls', async () => {
    let arrivals = 0;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    const work = async () => {
      const initial = database.tenantId;
      arrivals += 1;
      if (arrivals === 2) release();
      await barrier;
      const people = await database.client.person.findMany();
      return { initial, final: database.tenantId, tenants: people.map((person) => person.tenantId) };
    };
    const results = await Promise.all([request(TENANT_A, work), request(TENANT_B, work)]);
    for (const [index, tenant] of [TENANT_A, TENANT_B].entries()) {
      expect(results[index]).toMatchObject({ initial: tenant, final: tenant });
      expect(results[index]?.tenants.length).toBeGreaterThan(0);
      expect(results[index]?.tenants.every((value) => value === tenant)).toBe(true);
    }
  });

  it('supports finite void/empty handlers', async () => {
    expect(await lastValueFrom(interceptor.intercept(contextFor({ tenantId: TENANT_A }), { handle: () => EMPTY }))).toBeUndefined();
  });

  it('rolls back a write when the request Observable is unsubscribed', async () => {
    const transaction = vi.spyOn(database, 'runInTenantTransaction');
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const next: CallHandler = {
      handle: () => new Observable((subscriber) => {
        void database.client.person.create({ data: { id: createdIds[2], tenantId: TENANT_A, fullName: 'Synthetic Cancelled' } })
          .then(() => markStarted(), (error: unknown) => subscriber.error(error));
        // Deliberately do not emit/complete; cancellation must terminate this.
      }),
    };
    const subscription = interceptor.intercept(contextFor({ tenantId: TENANT_A }), next).subscribe();
    await started;
    const pending = transaction.mock.results[0]?.value as Promise<unknown>;
    subscription.unsubscribe();
    await expect(pending).rejects.toThrow('subscription was cancelled');
    expect(await database.runInTenantTransaction(TENANT_A, () => database.client.person.findUnique({ where: { id: createdIds[2] } }))).toBeNull();
  });

  it.each(['ownerUrl', 'platformUrl', 'bootstrapUrl'] as const)('refuses privileged runtime credentials: %s', async (connection) => {
    const candidate = new DatabaseService(connections[connection]);
    try {
      await expect(candidate.onModuleInit()).rejects.toThrow('Runtime database role must');
    } finally {
      await candidate.onModuleDestroy();
    }
  });

  it('refuses to initialize if FORCE RLS is missing from a model table', async () => {
    const owner = new Client({ connectionString: connections.ownerUrl });
    await owner.connect();
    const candidate = new DatabaseService(connections.runtimeUrl);
    try {
      await owner.query('ALTER TABLE people NO FORCE ROW LEVEL SECURITY');
      await expect(candidate.onModuleInit()).rejects.toThrow('complete ENABLE/FORCE RLS');
    } finally {
      await owner.query('ALTER TABLE people FORCE ROW LEVEL SECURITY');
      await candidate.onModuleDestroy();
      await owner.end();
    }
  });

  // Only transaction-boundary/timing semantics are stubbed below. All actual
  // isolation, SQL errors, commit/rollback, role and concurrency tests above use PG.
  it('does not emit the HTTP response before the transaction commit resolves', async () => {
    let commit!: () => void;
    let handlerDone!: () => void;
    const commitGate = new Promise<void>((resolve) => { commit = resolve; });
    const handled = new Promise<void>((resolve) => { handlerDone = resolve; });
    const boundary = {
      runInTenantTransaction: async (_tenantId: string, action: () => Promise<unknown>) => {
        const value = await action();
        handlerDone();
        await commitGate;
        return value;
      },
    };
    const candidate = new TenantInterceptor(boundary as unknown as DatabaseService);
    const values: unknown[] = [];
    const result = lastValueFrom(candidate.intercept(contextFor({ tenantId: TENANT_A }), { handle: () => of('placeholder') }).pipe(tap((value) => values.push(value))));
    await handled;
    expect(values).toEqual([]);
    commit();
    expect(await result).toBe('placeholder');
    expect(values).toEqual(['placeholder']);
  });

  it('does not emit success if the transaction commit fails', async () => {
    const failure = new Error('Synthetic commit failure');
    const boundary = {
      runInTenantTransaction: async (_tenantId: string, action: () => Promise<unknown>) => {
        await action();
        throw failure;
      },
    };
    const candidate = new TenantInterceptor(boundary as unknown as DatabaseService);
    const values: unknown[] = [];
    await expect(lastValueFrom(candidate.intercept(contextFor({ tenantId: TENANT_A }), { handle: () => of('placeholder') }).pipe(tap((value) => values.push(value)))))
      .rejects.toBe(failure);
    expect(values).toEqual([]);
  });

  it('rejects a non-completing handler at the finite request deadline', async () => {
    vi.useFakeTimers();
    const boundary = {
      runInTenantTransaction: async (_tenantId: string, action: () => Promise<unknown>) => action(),
    };
    const candidate = new TenantInterceptor(boundary as unknown as DatabaseService);
    const result = lastValueFrom(candidate.intercept(contextFor({ tenantId: TENANT_A }), { handle: () => NEVER }));
    const rejected = expect(result).rejects.toBeInstanceOf(RequestTimeoutException);
    await vi.advanceTimersByTimeAsync(10_001);
    await rejected;
  });
});
