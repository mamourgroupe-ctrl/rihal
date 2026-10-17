import {
  AuthenticatedUser,
  CreateDocumentInput,
  CreateGroupInput,
  CreateInvoiceInput,
  CreatePilgrimInput,
  DashboardStats,
  Group,
  GroupStatus,
  Invoice,
  InvoiceListQuery,
  Paginated,
  Pilgrim,
  PilgrimDocument,
  PilgrimListQuery,
  RegisterInput,
  Tenant,
  UpdateGroupInput,
  UpdatePilgrimInput,
  User,
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

  // ---------------------------------------------------------- tenants & auth

  findTenantBySlug(slug: string): Awaitable<Tenant | null>;
  findTenantById(id: string): Awaitable<Tenant | null>;
  updateTenant(
    tenantId: string,
    patch: Partial<Tenant>,
  ): Awaitable<Tenant | null>;
  createTenantWithAdmin(
    input: RegisterInput,
    passwordHash: string,
  ): Awaitable<{ tenant: Tenant; admin: User }>;

  findUsersByEmail(email: string): Awaitable<User[]>;
  findUserById(id: string): Awaitable<User | null>;
  listUsers(tenantId: string): Awaitable<User[]>;
  touchLastLogin(userId: string, at: string): Awaitable<void>;

  /** Resolved identity for a request (active user + active tenant). */
  findIdentity(userId: string): Awaitable<AuthenticatedUser | null>;

  // ---------------------------------------------------------------- documents

  listDocuments(tenantId: string, pilgrimId: string): Awaitable<PilgrimDocument[]>;
  findDocument(tenantId: string, id: string): Awaitable<PilgrimDocument | null>;
  createDocument(
    tenantId: string,
    pilgrimId: string,
    input: CreateDocumentInput,
  ): Awaitable<PilgrimDocument>;
  setDocumentVerified(
    tenantId: string,
    id: string,
    verified: boolean,
  ): Awaitable<PilgrimDocument | null>;
  deleteDocument(tenantId: string, id: string): Awaitable<boolean>;

  // ----------------------------------------------------------------- invoices

  listInvoices(
    tenantId: string,
    query: InvoiceListQuery,
  ): Awaitable<Paginated<Invoice>>;
  findInvoice(tenantId: string, id: string): Awaitable<Invoice | null>;
  createInvoice(
    tenantId: string,
    input: CreateInvoiceInput,
  ): Awaitable<Invoice>;
  updateInvoice(
    tenantId: string,
    id: string,
    patch: Partial<Invoice>,
  ): Awaitable<Invoice | null>;
  deleteInvoice(tenantId: string, id: string): Awaitable<boolean>;
  countIssuedInvoices(tenantId: string, year: number): Awaitable<number>;
  lastIssuedInvoice(tenantId: string): Awaitable<Invoice | null>;
}
