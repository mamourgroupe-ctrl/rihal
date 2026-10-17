import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  AuthenticatedUser,
  CreateDocumentInput,
  CreateGroupInput,
  CreateInvoiceInput,
  CreatePilgrimInput,
  DashboardStats,
  Gender,
  Group,
  GroupMember,
  GROUP_STATUSES,
  GroupStatus,
  PILGRIM_STATUSES,
  Invoice,
  InvoiceListQuery,
  InvoiceStatus,
  Paginated,
  Pilgrim,
  PilgrimDocument,
  PilgrimListQuery,
  PilgrimStatus,
  RegisterInput,
  Role,
  Tenant,
  UpdateGroupInput,
  UpdatePilgrimInput,
  User,
} from '../domain/types';

/** Rounds a monetary amount to 2 decimals (half-up). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * In-memory store used when no database is reachable.
 *
 * Every record keeps its `tenantId`, and every read/write is scoped by it —
 * exactly like the Prisma provider — so tenant isolation can be exercised
 * without a live PostgreSQL instance.
 */
@Injectable()
export class MemoryStore {
  readonly backend = 'memory' as const;

  private readonly tenants = new Map<string, Tenant>();
  private readonly users = new Map<string, User>();
  private readonly pilgrims = new Map<string, Pilgrim>();
  private readonly groups = new Map<string, Group>();
  private readonly members: GroupMember[] = [];
  private readonly documents = new Map<string, PilgrimDocument>();
  private readonly invoices = new Map<string, Invoice>();
  private seq = 0;

  constructor() {
    this.seed();
  }

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq.toString(36).padStart(6, '0')}${Math.random()
      .toString(36)
      .slice(2, 6)}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  // ---------------------------------------------------------------- pilgrims

  listPilgrims(
    tenantId: string,
    query: PilgrimListQuery,
  ): Paginated<Pilgrim> {
    const term = query.search?.trim().toLowerCase();
    let rows = [...this.pilgrims.values()].filter(
      (pilgrim) => pilgrim.tenantId === tenantId,
    );

    if (term) {
      rows = rows.filter((pilgrim) =>
        [
          pilgrim.fullNameAr,
          pilgrim.fullNameEn,
          pilgrim.passportNumber,
          pilgrim.phone ?? '',
          pilgrim.email ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(term),
      );
    }

    if (query.status) {
      rows = rows.filter((pilgrim) => pilgrim.status === query.status);
    }

    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / query.limit));
    const page = Math.min(Math.max(query.page, 1), pages);
    const start = (page - 1) * query.limit;

    return {
      items: rows.slice(start, start + query.limit),
      total,
      page,
      limit: query.limit,
      pages,
    };
  }

  findPilgrim(tenantId: string, id: string): Pilgrim | null {
    const pilgrim = this.pilgrims.get(id);
    return pilgrim && pilgrim.tenantId === tenantId ? pilgrim : null;
  }

  findPilgrimByPassport(
    tenantId: string,
    passportNumber: string,
  ): Pilgrim | null {
    return [...this.pilgrims.values()].find(
      (pilgrim) =>
        pilgrim.tenantId === tenantId &&
        pilgrim.passportNumber.toLowerCase() ===
          passportNumber.trim().toLowerCase(),
    ) ?? null;
  }

  createPilgrim(tenantId: string, input: CreatePilgrimInput): Pilgrim {
    if (this.findPilgrimByPassport(tenantId, input.passportNumber)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message: `رقم الجواز ${input.passportNumber} مسجّل مسبقاً لهذه الوكالة`,
          error: 'Conflict',
        },
        HttpStatus.CONFLICT,
      );
    }

    const timestamp = this.now();
    const pilgrim: Pilgrim = {
      id: this.nextId('pil'),
      tenantId,
      fullNameAr: input.fullNameAr.trim(),
      fullNameEn: input.fullNameEn.trim(),
      passportNumber: input.passportNumber.trim().toUpperCase(),
      passportExpiry: new Date(input.passportExpiry).toISOString(),
      nationality: input.nationality.trim().toUpperCase(),
      dateOfBirth: input.dateOfBirth
        ? new Date(input.dateOfBirth).toISOString()
        : null,
      gender: (input.gender as Gender | undefined) ?? null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      status: (input.status as PilgrimStatus | undefined) ?? 'DRAFT',
      notes: input.notes?.trim() || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.pilgrims.set(pilgrim.id, pilgrim);
    return pilgrim;
  }

  updatePilgrim(
    tenantId: string,
    id: string,
    input: UpdatePilgrimInput,
  ): Pilgrim | null {
    const current = this.findPilgrim(tenantId, id);
    if (!current) return null;

    if (
      input.passportNumber &&
      input.passportNumber.toLowerCase() !==
        current.passportNumber.toLowerCase()
    ) {
      const clash = this.findPilgrimByPassport(tenantId, input.passportNumber);
      if (clash && clash.id !== id) {
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            message: `رقم الجواز ${input.passportNumber} مسجّل مسبقاً لهذه الوكالة`,
            error: 'Conflict',
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    const updated: Pilgrim = {
      ...current,
      ...(input.fullNameAr !== undefined && {
        fullNameAr: input.fullNameAr.trim(),
      }),
      ...(input.fullNameEn !== undefined && {
        fullNameEn: input.fullNameEn.trim(),
      }),
      ...(input.passportNumber !== undefined && {
        passportNumber: input.passportNumber.trim().toUpperCase(),
      }),
      ...(input.passportExpiry !== undefined && {
        passportExpiry: new Date(input.passportExpiry).toISOString(),
      }),
      ...(input.nationality !== undefined && {
        nationality: input.nationality.trim().toUpperCase(),
      }),
      ...(input.dateOfBirth !== undefined && {
        dateOfBirth: input.dateOfBirth
          ? new Date(input.dateOfBirth).toISOString()
          : null,
      }),
      ...(input.gender !== undefined && { gender: input.gender }),
      ...(input.phone !== undefined && { phone: input.phone || null }),
      ...(input.email !== undefined && {
        email: input.email?.toLowerCase() || null,
      }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
      updatedAt: this.now(),
    };

    this.pilgrims.set(id, updated);
    return updated;
  }

  deletePilgrim(tenantId: string, id: string): boolean {
    const pilgrim = this.findPilgrim(tenantId, id);
    if (!pilgrim) return false;

    this.pilgrims.delete(id);
    for (const [documentId, document] of this.documents) {
      if (document.pilgrimId === id) this.documents.delete(documentId);
    }
    for (let index = this.members.length - 1; index >= 0; index -= 1) {
      if (this.members[index].pilgrimId === id) {
        const group = this.groups.get(this.members[index].groupId);
        if (group) {
          group.members = group.members.filter(
            (member) => member.pilgrimId !== id,
          );
        }
        this.members.splice(index, 1);
      }
    }
    return true;
  }

  // ------------------------------------------------------------------ groups

  listGroups(tenantId: string, query?: { status?: GroupStatus }): Group[] {
    return [...this.groups.values()]
      .filter(
        (group) =>
          group.tenantId === tenantId &&
          (!query?.status || group.status === query.status),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  findGroup(tenantId: string, id: string): Group | null {
    const group = this.groups.get(id);
    return group && group.tenantId === tenantId ? group : null;
  }

  createGroup(tenantId: string, input: CreateGroupInput): Group {
    const timestamp = this.now();
    const group: Group = {
      id: this.nextId('grp'),
      tenantId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      maxSize: input.maxSize ?? 4,
      status: (input.status as GroupStatus | undefined) ?? 'DRAFT',
      scheduledDate: input.scheduledDate
        ? new Date(input.scheduledDate).toISOString()
        : null,
      createdAt: timestamp,
      updatedAt: timestamp,
      members: [],
    };
    this.groups.set(group.id, group);
    return group;
  }

  updateGroup(
    tenantId: string,
    id: string,
    input: UpdateGroupInput,
  ): Group | null {
    const current = this.findGroup(tenantId, id);
    if (!current) return null;

    const updated: Group = {
      ...current,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && {
        description: input.description?.trim() || null,
      }),
      ...(input.maxSize !== undefined && { maxSize: input.maxSize }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scheduledDate !== undefined && {
        scheduledDate: input.scheduledDate
          ? new Date(input.scheduledDate).toISOString()
          : null,
      }),
      updatedAt: this.now(),
    };
    this.groups.set(id, updated);
    return updated;
  }

  deleteGroup(tenantId: string, id: string): boolean {
    if (!this.findGroup(tenantId, id)) return false;
    this.groups.delete(id);
    for (let index = this.members.length - 1; index >= 0; index -= 1) {
      if (this.members[index].groupId === id) this.members.splice(index, 1);
    }
    return true;
  }

  addMember(
    tenantId: string,
    groupId: string,
    pilgrimId: string,
    isLeader = false,
  ): Group {
    const group = this.findGroup(tenantId, groupId);
    if (!group) {
      throw new HttpException('المجموعة غير موجودة', HttpStatus.NOT_FOUND);
    }
    const pilgrim = this.findPilgrim(tenantId, pilgrimId);
    if (!pilgrim) {
      throw new HttpException('المعتمر غير موجود', HttpStatus.NOT_FOUND);
    }
    if (group.members.some((member) => member.pilgrimId === pilgrimId)) {
      throw new HttpException(
        'المعتمر عضو في هذه المجموعة بالفعل',
        HttpStatus.CONFLICT,
      );
    }
    if (group.members.length >= group.maxSize) {
      throw new HttpException(
        `المجموعة مكتملة (${group.maxSize} أعضاء)`,
        HttpStatus.CONFLICT,
      );
    }
    if (isLeader) {
      group.members = group.members.map((member) => ({
        ...member,
        isLeader: false,
      }));
    }

    const member: GroupMember = {
      id: this.nextId('mem'),
      groupId,
      pilgrimId,
      isLeader,
      pilgrim: {
        id: pilgrim.id,
        fullNameAr: pilgrim.fullNameAr,
        fullNameEn: pilgrim.fullNameEn,
        passportNumber: pilgrim.passportNumber,
        status: pilgrim.status,
      },
    };
    this.members.push(member);
    group.members.push(member);
    group.updatedAt = this.now();
    return group;
  }

  removeMember(
    tenantId: string,
    groupId: string,
    pilgrimId: string,
  ): Group | null {
    const group = this.findGroup(tenantId, groupId);
    if (!group) return null;

    group.members = group.members.filter(
      (member) => member.pilgrimId !== pilgrimId,
    );
    const index = this.members.findIndex(
      (member) =>
        member.groupId === groupId && member.pilgrimId === pilgrimId,
    );
    if (index >= 0) this.members.splice(index, 1);
    group.updatedAt = this.now();
    return group;
  }

  // --------------------------------------------------------------- dashboard

  stats(tenantId: string): DashboardStats {
    const pilgrims = [...this.pilgrims.values()].filter(
      (pilgrim) => pilgrim.tenantId === tenantId,
    );
    const groups = this.listGroups(tenantId);

    const byStatus = Object.fromEntries(
      PILGRIM_STATUSES.map((status) => [status, 0]),
    ) as Record<PilgrimStatus, number>;
    for (const pilgrim of pilgrims) byStatus[pilgrim.status] += 1;

    const byGroupStatus = Object.fromEntries(
      GROUP_STATUSES.map((status) => [status, 0]),
    ) as Record<GroupStatus, number>;
    for (const group of groups) byGroupStatus[group.status] += 1;

    const expiryLimit = new Date();
    expiryLimit.setMonth(expiryLimit.getMonth() + 6);

    return {
      pilgrims: {
        total: pilgrims.length,
        byStatus,
        readyForBooking:
          byStatus.READY_FOR_BOOKING +
          byStatus.BOOKED +
          byStatus.PERMIT_ISSUED +
          byStatus.COMPLETED,
        documentsPending:
          byStatus.DRAFT +
          byStatus.REGISTERED,
      },
      groups: {
        total: groups.length,
        byStatus: byGroupStatus,
        openSlots: groups
          .filter((group) => !['COMPLETED', 'CANCELLED'].includes(group.status))
          .reduce(
            (slots, group) => slots + Math.max(0, group.maxSize - group.members.length),
            0,
          ),
      },
      passportsExpiringSoon: pilgrims.filter(
        (pilgrim) =>
          new Date(pilgrim.passportExpiry) <= expiryLimit &&
          pilgrim.status !== 'CANCELLED',
      ).length,
    };
  }


  // ---------------------------------------------------------------- documents

  listDocuments(tenantId: string, pilgrimId: string): PilgrimDocument[] {
    return [...this.documents.values()]
      .filter(
        (document) =>
          document.tenantId === tenantId && document.pilgrimId === pilgrimId,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  findDocument(tenantId: string, id: string): PilgrimDocument | null {
    const document = this.documents.get(id);
    return document && document.tenantId === tenantId ? document : null;
  }

  createDocument(
    tenantId: string,
    pilgrimId: string,
    input: CreateDocumentInput,
  ): PilgrimDocument {
    if (!this.findPilgrim(tenantId, pilgrimId)) {
      throw new HttpException('المعتمر غير موجود', HttpStatus.NOT_FOUND);
    }
    const document: PilgrimDocument = {
      id: this.nextId('doc'),
      tenantId,
      pilgrimId,
      type: input.type,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      ocrData: input.ocrData ?? null,
      verified: input.verified ?? false,
      createdAt: this.now(),
    };
    this.documents.set(document.id, document);
    return document;
  }

  setDocumentVerified(
    tenantId: string,
    id: string,
    verified: boolean,
  ): PilgrimDocument | null {
    const document = this.findDocument(tenantId, id);
    if (!document) return null;
    document.verified = verified;
    return document;
  }

  deleteDocument(tenantId: string, id: string): boolean {
    if (!this.findDocument(tenantId, id)) return false;
    this.documents.delete(id);
    return true;
  }


  // ---------------------------------------------------------------- invoices

  listInvoices(tenantId: string, query: InvoiceListQuery): Paginated<Invoice> {
    let rows = [...this.invoices.values()].filter(
      (invoice) => invoice.tenantId === tenantId,
    );
    if (query.status) {
      rows = rows.filter((invoice) => invoice.status === query.status);
    }
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / query.limit));
    const page = Math.min(Math.max(query.page, 1), pages);
    const start = (page - 1) * query.limit;
    return {
      items: rows.slice(start, start + query.limit),
      total,
      page,
      limit: query.limit,
      pages,
    };
  }

  findInvoice(tenantId: string, id: string): Invoice | null {
    const invoice = this.invoices.get(id);
    return invoice && invoice.tenantId === tenantId ? invoice : null;
  }

  createInvoice(tenantId: string, input: CreateInvoiceInput): Invoice {
    if (!this.findTenantById(tenantId)) {
      throw new HttpException('الوكالة غير موجودة', HttpStatus.NOT_FOUND);
    }
    if (input.pilgrimId && !this.findPilgrim(tenantId, input.pilgrimId)) {
      throw new HttpException('المعتمر غير موجود', HttpStatus.NOT_FOUND);
    }

    const timestamp = this.now();
    const items = input.items.map((item, index) => ({
      id: this.nextId('itm'),
      description: item.description.trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: roundMoney(item.quantity * item.unitPrice),
      sortOrder: index,
    }));

    const subtotal = roundMoney(
      items.reduce((sum, item) => sum + item.lineTotal, 0),
    );
    const vatRate = input.vatRate ?? 0.15;
    const vatAmount = roundMoney(subtotal * vatRate);

    const invoice: Invoice = {
      id: this.nextId('inv'),
      tenantId,
      invoiceNumber: null,
      uuid: null,
      buyerName: input.buyerName.trim(),
      buyerVatNumber: input.buyerVatNumber?.trim() || null,
      pilgrimId: input.pilgrimId ?? null,
      items,
      currency: (input.currency ?? 'SAR').toUpperCase(),
      vatRate,
      subtotal,
      vatAmount,
      total: roundMoney(subtotal + vatAmount),
      status: 'DRAFT',
      zatcaQr: null,
      zatcaHash: null,
      previousHash: null,
      notes: input.notes?.trim() || null,
      issuedAt: null,
      dueDate: input.dueDate ? new Date(input.dueDate).toISOString() : null,
      paidAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  updateInvoice(
    tenantId: string,
    id: string,
    patch: Partial<Invoice>,
  ): Invoice | null {
    const current = this.findInvoice(tenantId, id);
    if (!current) return null;
    const updated: Invoice = {
      ...current,
      ...patch,
      tenantId,
      id,
      updatedAt: this.now(),
    };
    this.invoices.set(id, updated);
    return updated;
  }

  deleteInvoice(tenantId: string, id: string): boolean {
    if (!this.findInvoice(tenantId, id)) return false;
    this.invoices.delete(id);
    return true;
  }

  countIssuedInvoices(tenantId: string, year: number): number {
    return [...this.invoices.values()].filter(
      (invoice) =>
        invoice.tenantId === tenantId &&
        invoice.invoiceNumber &&
        invoice.invoiceNumber.includes(`-${year}-`) &&
        invoice.status !== 'CANCELLED',
    ).length;
  }

  lastIssuedInvoice(tenantId: string): Invoice | null {
    return (
      [...this.invoices.values()]
        .filter(
          (invoice) => invoice.tenantId === tenantId && invoice.zatcaHash,
        )
        .sort((a, b) => (b.issuedAt ?? '').localeCompare(a.issuedAt ?? ''))[0] ??
      null
    );
  }

  // ----------------------------------------------------------- tenants & auth


  findTenantBySlug(slug: string): Tenant | null {
    return (
      [...this.tenants.values()].find(
        (tenant) => tenant.slug.toLowerCase() === slug.trim().toLowerCase(),
      ) ?? null
    );
  }

  findTenantById(id: string): Tenant | null {
    return this.tenants.get(id) ?? null;
  }

  updateTenant(tenantId: string, patch: Partial<Tenant>): Tenant | null {
    const current = this.tenants.get(tenantId);
    if (!current) return null;
    const updated: Tenant = {
      ...current,
      ...(patch.name !== undefined && { name: patch.name.trim() }),
      ...(patch.vatNumber !== undefined && {
        vatNumber: patch.vatNumber?.trim() || null,
      }),
      ...(patch.crNumber !== undefined && {
        crNumber: patch.crNumber?.trim() || null,
      }),
      ...(patch.addressLine !== undefined && {
        addressLine: patch.addressLine?.trim() || null,
      }),
      ...(patch.city !== undefined && { city: patch.city?.trim() || null }),
      updatedAt: this.now(),
    };
    this.tenants.set(tenantId, updated);
    return updated;
  }

  createTenantWithAdmin(
    input: RegisterInput,
    passwordHash: string,
  ): { tenant: Tenant; admin: User } {
    const slug = input.slug.trim().toLowerCase();
    if (this.findTenantBySlug(slug)) {
      throw new HttpException(
        'معرّف الوكالة (slug) مستخدم مسبقاً',
        HttpStatus.CONFLICT,
      );
    }

    const timestamp = this.now();
    const tenant: Tenant = {
      id: this.nextId('ten'),
      name: input.agencyName.trim(),
      slug,
      plan: 'FREE',
      status: 'ACTIVE',
      vatNumber: null,
      crNumber: null,
      addressLine: null,
      city: null,
      country: 'SA',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.tenants.set(tenant.id, tenant);

    const admin: User = {
      id: this.nextId('usr'),
      tenantId: tenant.id,
      email: input.email.trim().toLowerCase(),
      passwordHash,
      name: input.name.trim(),
      role: 'ADMIN',
      phone: input.phone?.trim() || null,
      isActive: true,
      lastLoginAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.users.set(admin.id, admin);

    return { tenant, admin };
  }

  findUsersByEmail(email: string): User[] {
    const normalized = email.trim().toLowerCase();
    return [...this.users.values()].filter(
      (user) => user.email === normalized,
    );
  }

  findUserById(id: string): User | null {
    return this.users.get(id) ?? null;
  }

  listUsers(tenantId: string): User[] {
    return [...this.users.values()]
      .filter((user) => user.tenantId === tenantId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  touchLastLogin(userId: string, at: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.lastLoginAt = at;
      user.updatedAt = at;
    }
  }

  findIdentity(userId: string): AuthenticatedUser | null {
    const user = this.users.get(userId);
    if (!user || !user.isActive) return null;
    const tenant = this.tenants.get(user.tenantId);
    if (!tenant || tenant.status !== 'ACTIVE') return null;
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  // TODO: remove demo seed once Prisma is connected.

  private seed(): void {
    const tenant = 'tenant_demo';
    const now = new Date();

    const timestamp = now.toISOString();
    this.tenants.set(tenant, {
      id: tenant,
      name: 'وكالة رحال التجريبية',
      slug: 'demo',
      plan: 'PRO',
      status: 'ACTIVE',
      vatNumber: '310123456700003',
      crNumber: '1010123456',
      addressLine: 'طريق الملك فهد، حي العليا',
      city: 'الرياض',
      country: 'SA',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const demoHash =
      '$2b$10$CtNVdXEJeI4i2lTd8Y2O4uJC.tdJjGFzKZqSYqyH68b26S74ORsUS';
    const demoUsers: Array<[string, string, Role]> = [
      ['admin@rihal.demo', 'مدير الوكالة', 'ADMIN'],
      ['operator@rihal.demo', 'منسّق العمليات', 'OPERATOR'],
      ['supervisor@rihal.demo', 'مشرف المجموعات', 'SUPERVISOR'],
      ['viewer@rihal.demo', 'مطّلع (قراءة فقط)', 'VIEWER'],
    ];
    for (const [email, name, role] of demoUsers) {
      const user: User = {
        id: this.nextId('usr'),
        tenantId: tenant,
        email,
        passwordHash: demoHash,
        name,
        role,
        phone: null,
        isActive: true,
        lastLoginAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      this.users.set(user.id, user);
    }
    const iso = (offsetDays: number) =>
      new Date(now.getTime() + offsetDays * 86_400_000).toISOString();

    const people: Array<
      [string, string, string, string, PilgrimStatus, Gender, string, number]
    > = [
      ['عبد الله محمد العتيبي', 'Abdullah Mohammed Al-Otaibi', 'A1234567', 'SAU', 'READY_FOR_BOOKING', 'MALE', '+966501234567', 40],
      ['فاطمة أحمد الزهراني', 'Fatima Ahmed Al-Zahrani', 'A2345678', 'SAU', 'DOCUMENTS_UPLOADED', 'FEMALE', '+966501234568', 55],
      ['يوسف كريم بن صالح', 'Youssef Karim Ben Salah', 'T9876543', 'TUN', 'REGISTERED', 'MALE', '+21620123456', 20],
      ['مريم حسن العلوي', 'Mariam Hassan Al-Alawi', 'M4567890', 'MAR', 'DRAFT', 'FEMALE', '+212612345678', 8],
      ['إبراهيم داود سيسي', 'Ibrahim Daoud Sissoko', 'M1234567', 'MLI', 'BOOKED', 'MALE', '+22370123456', 30],
      ['خديجة عمر با', 'Khadija Omar Ba', 'S3456789', 'SEN', 'PERMIT_ISSUED', 'FEMALE', '+221771234567', 12],
      ['عمر فاروق رحماني', 'Omar Farouk Rahmani', 'A3456789', 'SAU', 'COMPLETED', 'MALE', '+966501234569', 90],
      ['زينب علي حسين', 'Zainab Ali Hussein', 'I5678901', 'IRQ', 'CANCELLED', 'FEMALE', '+9647712345678', 18],
      ['أحمد سمير المصري', 'Ahmed Samir Al-Masri', 'E6789012', 'EGY', 'READY_FOR_BOOKING', 'MALE', '+201012345678', 35],
      ['سلمى عبد الرحمن', 'Salma Abdelrahman', 'S7890123', 'SDN', 'DOCUMENTS_UPLOADED', 'FEMALE', '+249912345678', 14],
      ['محمد أمين توفيق', 'Mohamed Amine Tewfik', 'A8901234', 'DZA', 'REGISTERED', 'MALE', '+213551234567', 22],
      ['نور الهدى قاسم', 'Nour Al-Huda Qasem', 'J9012345', 'JOR', 'DRAFT', 'FEMALE', '+962791234567', 5],
    ];

    for (const [
      fullNameAr,
      fullNameEn,
      passportNumber,
      nationality,
      status,
      gender,
      phone,
      passportMonths,
    ] of people) {
      const created = iso(-Math.round(Math.random() * 45) - 2);
      const pilgrim: Pilgrim = {
        id: this.nextId('pil'),
        tenantId: tenant,
        fullNameAr,
        fullNameEn,
        passportNumber,
        passportExpiry: iso(passportMonths * 30 - 5),
        nationality,
        dateOfBirth: iso(-365 * (24 + Math.round(Math.random() * 30))),
        gender,
        phone,
        email: `${passportNumber.toLowerCase()}@example.com`,
        status,
        notes: null,
        createdAt: created,
        updatedAt: created,
      };
      this.pilgrims.set(pilgrim.id, pilgrim);
    }

    const allPilgrims = [...this.pilgrims.values()];
    const groupSpecs: Array<
      [string, string, GroupStatus, number, number[]]
    > = [
      ['مجموعة الرحمة — ربيع الأول', 'مجموعة عمرة عائلية، 4 أفراد', 'READY', 4, [0, 1, 2, 3]],
      ['مجموعة النور — رجب', 'عمرة فردية للمتقاعدين', 'SUBMITTED', 6, [4, 5, 8]],
      ['مجموعة البركة — شعبان', 'مجموعة شبابية', 'DRAFT', 4, [10]],
      ['مجموعة الإيمان — رمضان', 'المجموعة الأولى لموسم رمضان', 'CONFIRMED', 6, [9, 11]],
    ];

    groupSpecs.forEach(([name, description, status, maxSize, memberIndexes], i) => {
      const created = iso(-20 + i);
      const group: Group = {
        id: this.nextId('grp'),
        tenantId: tenant,
        name,
        description,
        maxSize,
        status,
        scheduledDate: iso(30 + i * 15),
        createdAt: created,
        updatedAt: created,
        members: [],
      };
      this.groups.set(group.id, group);

      memberIndexes.forEach((pilgrimIndex, position) => {
        const pilgrim = allPilgrims[pilgrimIndex];
        if (!pilgrim) return;
        const member: GroupMember = {
          id: this.nextId('mem'),
          groupId: group.id,
          pilgrimId: pilgrim.id,
          isLeader: position === 0,
          pilgrim: {
            id: pilgrim.id,
            fullNameAr: pilgrim.fullNameAr,
            fullNameEn: pilgrim.fullNameEn,
            passportNumber: pilgrim.passportNumber,
            status: pilgrim.status,
          },
        };
        this.members.push(member);
        group.members.push(member);
      });
    });
  }
}
