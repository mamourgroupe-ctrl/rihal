import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataProvider } from './data-provider';
import { MemoryStore } from './memory.store';
import { PrismaProvider } from './prisma.provider';
import {
  AuthenticatedUser,
  CreateGroupInput,
  CreatePilgrimInput,
  DashboardStats,
  Group,
  GroupStatus,
  Paginated,
  Pilgrim,
  PilgrimListQuery,
  RegisterInput,
  Tenant,
  UpdateGroupInput,
  UpdatePilgrimInput,
  User,
} from './types';

/**
 * Chooses the storage backend at boot:
 *   1. Prisma/PostgreSQL when DATABASE_URL is reachable.
 *   2. In-memory demo store otherwise (offline dev, previews, CI).
 *
 * `PERSISTENCE=memory` forces the demo store, `PERSISTENCE=postgres` disables
 * the fallback so a misconfigured database fails loudly.
 */
@Injectable()
export class DataService
  implements DataProvider, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DataService.name);
  private delegate: DataProvider;
  backend: 'prisma' | 'memory' = 'memory';
  fallbackReason?: string;

  constructor(
    private readonly memory: MemoryStore,
    private readonly prisma: PrismaProvider,
  ) {
    this.delegate = memory;
  }

  async onModuleInit(): Promise<void> {
    const mode = (process.env.PERSISTENCE ?? 'auto').toLowerCase();

    if (mode === 'memory') {
      this.fallbackReason = 'PERSISTENCE=memory';
      this.logger.warn(
        'Persistence forced to in-memory demo store (PERSISTENCE=memory)',
      );
      return;
    }

    try {
      await this.prisma.connect();
      this.delegate = this.prisma;
      this.backend = 'prisma';
      this.fallbackReason = undefined;
    } catch (error) {
      this.fallbackReason =
        error instanceof Error ? error.message : String(error);

      if (mode === 'postgres') {
        throw new Error(
          `PERSISTENCE=postgres but the database is unreachable: ${this.fallbackReason}`,
        );
      }

      this.logger.warn(
        `PostgreSQL unavailable — falling back to the in-memory demo store (${this.fallbackReason}). ` +
          'Run `pnpm db:generate` and set DATABASE_URL, or use PERSISTENCE=postgres to fail fast.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.backend === 'prisma') await this.prisma.disconnect();
  }

  // ---------------------------------------------------------------- pilgrims

  listPilgrims(tenantId: string, query: PilgrimListQuery): Promise<Paginated<Pilgrim>> {
    return this.resolve(this.delegate.listPilgrims(tenantId, query));
  }

  findPilgrim(tenantId: string, id: string): Promise<Pilgrim | null> {
    return this.resolve(this.delegate.findPilgrim(tenantId, id));
  }

  createPilgrim(tenantId: string, input: CreatePilgrimInput): Promise<Pilgrim> {
    return this.resolve(this.delegate.createPilgrim(tenantId, input));
  }

  updatePilgrim(
    tenantId: string,
    id: string,
    input: UpdatePilgrimInput,
  ): Promise<Pilgrim | null> {
    return this.resolve(this.delegate.updatePilgrim(tenantId, id, input));
  }

  deletePilgrim(tenantId: string, id: string): Promise<boolean> {
    return this.resolve(this.delegate.deletePilgrim(tenantId, id));
  }

  // ------------------------------------------------------------------ groups

  listGroups(tenantId: string, query?: { status?: GroupStatus }): Promise<Group[]> {
    return this.resolve(this.delegate.listGroups(tenantId, query));
  }

  findGroup(tenantId: string, id: string): Promise<Group | null> {
    return this.resolve(this.delegate.findGroup(tenantId, id));
  }

  createGroup(tenantId: string, input: CreateGroupInput): Promise<Group> {
    return this.resolve(this.delegate.createGroup(tenantId, input));
  }

  updateGroup(
    tenantId: string,
    id: string,
    input: UpdateGroupInput,
  ): Promise<Group | null> {
    return this.resolve(this.delegate.updateGroup(tenantId, id, input));
  }

  deleteGroup(tenantId: string, id: string): Promise<boolean> {
    return this.resolve(this.delegate.deleteGroup(tenantId, id));
  }

  addMember(
    tenantId: string,
    groupId: string,
    pilgrimId: string,
    isLeader?: boolean,
  ): Promise<Group> {
    return this.resolve(
      this.delegate.addMember(tenantId, groupId, pilgrimId, isLeader),
    );
  }

  removeMember(
    tenantId: string,
    groupId: string,
    pilgrimId: string,
  ): Promise<Group | null> {
    return this.resolve(
      this.delegate.removeMember(tenantId, groupId, pilgrimId),
    );
  }

  stats(tenantId: string): Promise<DashboardStats> {
    return this.resolve(this.delegate.stats(tenantId));
  }

  // ----------------------------------------------------------- tenants & auth

  findTenantBySlug(slug: string): Promise<Tenant | null> {
    return this.resolve(this.delegate.findTenantBySlug(slug));
  }

  findTenantById(id: string): Promise<Tenant | null> {
    return this.resolve(this.delegate.findTenantById(id));
  }

  createTenantWithAdmin(
    input: RegisterInput,
    passwordHash: string,
  ): Promise<{ tenant: Tenant; admin: User }> {
    return this.resolve(this.delegate.createTenantWithAdmin(input, passwordHash));
  }

  findUsersByEmail(email: string): Promise<User[]> {
    return this.resolve(this.delegate.findUsersByEmail(email));
  }

  findUserById(id: string): Promise<User | null> {
    return this.resolve(this.delegate.findUserById(id));
  }

  listUsers(tenantId: string): Promise<User[]> {
    return this.resolve(this.delegate.listUsers(tenantId));
  }

  touchLastLogin(userId: string, at: string): Promise<void> {
    return this.resolve(this.delegate.touchLastLogin(userId, at));
  }

  findIdentity(userId: string): Promise<AuthenticatedUser | null> {
    return this.resolve(this.delegate.findIdentity(userId));
  }

  /** Wraps the synchronous in-memory store so callers always await. */
  private async resolve<T>(value: T | Promise<T>): Promise<T> {
    return value;
  }
}
