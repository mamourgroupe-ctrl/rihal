import {
  CreateGroupInput,
  CreatePilgrimInput,
  DashboardStats,
  Group,
  GroupStatus,
  Paginated,
  Pilgrim,
  PilgrimListQuery,
  UpdateGroupInput,
  UpdatePilgrimInput,
} from './types';

/** Either a value or a promise of it — in-memory returns sync, Prisma async. */
export type Awaitable<T> = T | Promise<T>;

/**
 * Storage contract implemented by both the Prisma provider (real database)
 * and the in-memory provider (demo / offline fallback).
 *
 * Every method receives the tenant id explicitly so tenant scoping is never
 * implicit — the Prisma provider additionally relies on the RLS policies in
 * packages/database/prisma/sql/rls.sql.
 */
export interface DataProvider {
  readonly backend: 'prisma' | 'memory';

  listPilgrims(tenantId: string, query: PilgrimListQuery): Awaitable<Paginated<Pilgrim>>;
  findPilgrim(tenantId: string, id: string): Awaitable<Pilgrim | null>;
  createPilgrim(tenantId: string, input: CreatePilgrimInput): Awaitable<Pilgrim>;
  updatePilgrim(
    tenantId: string,
    id: string,
    input: UpdatePilgrimInput,
  ): Awaitable<Pilgrim | null>;
  deletePilgrim(tenantId: string, id: string): Awaitable<boolean>;

  listGroups(tenantId: string, query?: { status?: GroupStatus }): Awaitable<Group[]>;
  findGroup(tenantId: string, id: string): Awaitable<Group | null>;
  createGroup(tenantId: string, input: CreateGroupInput): Awaitable<Group>;
  updateGroup(
    tenantId: string,
    id: string,
    input: UpdateGroupInput,
  ): Awaitable<Group | null>;
  deleteGroup(tenantId: string, id: string): Awaitable<boolean>;
  addMember(
    tenantId: string,
    groupId: string,
    pilgrimId: string,
    isLeader?: boolean,
  ): Awaitable<Group>;
  removeMember(
    tenantId: string,
    groupId: string,
    pilgrimId: string,
  ): Awaitable<Group | null>;

  stats(tenantId: string): Awaitable<DashboardStats>;
}
