import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DataProvider } from './data-provider';
import {
  AuthenticatedUser,
  CreateDocumentInput,
  CreateGroupInput,
  CreateInvoiceInput,
  CreatePilgrimInput,
  DashboardStats,
  Group,
  GroupStatus,
  GROUP_STATUSES,
  Invoice,
  InvoiceListQuery,
  Paginated,
  PILGRIM_STATUSES,
  Pilgrim,
  PilgrimDocument,
  PilgrimListQuery,
  PilgrimStatus,
  RegisterInput,
  Tenant,
  UpdateGroupInput,
  UpdatePilgrimInput,
  User,
} from './types';

/**
 * Prisma-backed provider.
 *
 * The Prisma client is loaded lazily (`require`) so this API still boots when
 * the generated client is missing — e.g. before running `pnpm db:generate`.
 * `connect()` throws in that case and DataService falls back to the in-memory
 * provider.
 */
@Injectable()
export class PrismaProvider implements DataProvider {
  readonly backend = 'prisma' as const;

  private readonly logger = new Logger(PrismaProvider.name);
  private client: any = null;

  async connect(): Promise<void> {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }

    const mod = require('@rihal/database');
    this.client = mod.prisma;
    await this.client.$connect();
    // Fail fast on transports that answer the handshake but cannot query.
    await this.client.$queryRaw`SELECT 1`;
    this.logger.log('Connected to PostgreSQL through Prisma');
  }

  async disconnect(): Promise<void> {
    await this.client?.$disconnect?.();
  }

  // ---------------------------------------------------------------- pilgrims

  async listPilgrims(
    tenantId: string,
    query: PilgrimListQuery,
  ): Promise<Paginated<Pilgrim>> {
    const where = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { fullNameAr: { contains: query.search, mode: 'insensitive' } },
              { fullNameEn: { contains: query.search, mode: 'insensitive' } },
              {
                passportNumber: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              { phone: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.client.$transaction([
      this.client.pilgrim.count({ where }),
      this.client.pilgrim.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      items: rows.map((row: any) => this.toPilgrim(row)),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async findPilgrim(tenantId: string, id: string): Promise<Pilgrim | null> {
    const row = await this.client.pilgrim.findFirst({ where: { id, tenantId } });
    return row ? this.toPilgrim(row) : null;
  }

  async createPilgrim(
    tenantId: string,
    input: CreatePilgrimInput,
  ): Promise<Pilgrim> {
    try {
      const row = await this.client.pilgrim.create({
        data: {
          ...this.toPilgrimData(input),
          tenantId,
        },
      });
      return this.toPilgrim(row);
    } catch (error) {
      throw this.mapError(error, input.passportNumber);
    }
  }

  async updatePilgrim(
    tenantId: string,
    id: string,
    input: UpdatePilgrimInput,
  ): Promise<Pilgrim | null> {
    const existing = await this.findPilgrim(tenantId, id);
    if (!existing) return null;

    try {
      const row = await this.client.pilgrim.update({
        where: { id },
        data: this.toPilgrimData(input),
      });
      return this.toPilgrim(row);
    } catch (error) {
      throw this.mapError(error, input.passportNumber);
    }
  }

  async deletePilgrim(tenantId: string, id: string): Promise<boolean> {
    const existing = await this.findPilgrim(tenantId, id);
    if (!existing) return false;
    await this.client.pilgrim.delete({ where: { id } });
    return true;
  }

  // ------------------------------------------------------------------ groups

  async listGroups(
    tenantId: string,
    query?: { status?: GroupStatus },
  ): Promise<Group[]> {
    const rows = await this.client.group.findMany({
      where: {
        tenantId,
        ...(query?.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        members: {
          include: {
            pilgrim: {
              select: {
                id: true,
                fullNameAr: true,
                fullNameEn: true,
                passportNumber: true,
                status: true,
              },
            },
          },
        },
      },
    });
    return rows.map((row: any) => this.toGroup(row));
  }

  async findGroup(tenantId: string, id: string): Promise<Group | null> {
    const row = await this.client.group.findFirst({
      where: { id, tenantId },
      include: {
        members: {
          include: {
            pilgrim: {
              select: {
                id: true,
                fullNameAr: true,
                fullNameEn: true,
                passportNumber: true,
                status: true,
              },
            },
          },
        },
      },
    });
    return row ? this.toGroup(row) : null;
  }

  async createGroup(tenantId: string, input: CreateGroupInput): Promise<Group> {
    const row = await this.client.group.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description ?? null,
        maxSize: input.maxSize ?? 4,
        status: input.status ?? 'DRAFT',
        scheduledDate: input.scheduledDate
          ? new Date(input.scheduledDate)
          : null,
      },
      include: { members: true },
    });
    return this.toGroup(row);
  }

  async updateGroup(
    tenantId: string,
    id: string,
    input: UpdateGroupInput,
  ): Promise<Group | null> {
    const existing = await this.findGroup(tenantId, id);
    if (!existing) return null;

    await this.client.group.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description || null,
        }),
        ...(input.maxSize !== undefined && { maxSize: input.maxSize }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.scheduledDate !== undefined && {
          scheduledDate: input.scheduledDate
            ? new Date(input.scheduledDate)
            : null,
        }),
      },
    });
    return this.findGroup(tenantId, id);
  }

  async deleteGroup(tenantId: string, id: string): Promise<boolean> {
    const existing = await this.findGroup(tenantId, id);
    if (!existing) return false;
    await this.client.group.delete({ where: { id } });
    return true;
  }

  async addMember(
    tenantId: string,
    groupId: string,
    pilgrimId: string,
    isLeader = false,
  ): Promise<Group> {
    const group = await this.findGroup(tenantId, groupId);
    if (!group) {
      throw new HttpException('المجموعة غير موجودة', HttpStatus.NOT_FOUND);
    }
    if (!(await this.findPilgrim(tenantId, pilgrimId))) {
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

    await this.client.$transaction(async (tx: any) => {
      if (isLeader) {
        await tx.groupMember.updateMany({
          where: { groupId },
          data: { isLeader: false },
        });
      }
      await tx.groupMember.create({
        data: { groupId, pilgrimId, isLeader },
      });
    });

    return (await this.findGroup(tenantId, groupId)) as Group;
  }

  async removeMember(
    tenantId: string,
    groupId: string,
    pilgrimId: string,
  ): Promise<Group | null> {
    const group = await this.findGroup(tenantId, groupId);
    if (!group) return null;

    await this.client.groupMember.deleteMany({
      where: { groupId, pilgrimId },
    });
    return this.findGroup(tenantId, groupId);
  }

  // --------------------------------------------------------------- dashboard

  async stats(tenantId: string): Promise<DashboardStats> {
    const [statusCounts, groupStatusCounts, groupSizes, passportRows] =
      await this.client.$transaction([
        this.client.pilgrim.groupBy({
          by: ['status'],
          where: { tenantId },
          _count: { _all: true },
        }),
        this.client.group.groupBy({
          by: ['status'],
          where: { tenantId },
          _count: { _all: true },
        }),
        this.client.group.findMany({
          where: {
            tenantId,
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          select: { maxSize: true, _count: { select: { members: true } } },
        }),
        this.client.pilgrim.count({
          where: {
            tenantId,
            status: { not: 'CANCELLED' },
            passportExpiry: {
              lte: new Date(Date.now() + 182 * 86_400_000),
            },
          },
        }),
      ]);

    const byStatus = Object.fromEntries(
      PILGRIM_STATUSES.map((status) => [status, 0]),
    ) as Record<PilgrimStatus, number>;
    for (const row of statusCounts) {
      byStatus[row.status as PilgrimStatus] = row._count._all;
    }

    const byGroupStatus = Object.fromEntries(
      GROUP_STATUSES.map((status) => [status, 0]),
    ) as Record<GroupStatus, number>;
    for (const row of groupStatusCounts) {
      byGroupStatus[row.status as GroupStatus] = row._count._all;
    }

    return {
      pilgrims: {
        total: Object.values(byStatus).reduce((sum, value) => sum + value, 0),
        byStatus,
        readyForBooking:
          byStatus.READY_FOR_BOOKING +
          byStatus.BOOKED +
          byStatus.PERMIT_ISSUED +
          byStatus.COMPLETED,
        documentsPending: byStatus.DRAFT + byStatus.REGISTERED,
      },
      groups: {
        total: Object.values(byGroupStatus).reduce(
          (sum, value) => sum + value,
          0,
        ),
        byStatus: byGroupStatus,
        openSlots: groupSizes.reduce(
          (slots: number, group: any) =>
            slots + Math.max(0, group.maxSize - group._count.members),
          0,
        ),
      },
      passportsExpiringSoon: passportRows,
    };
  }

  // ---------------------------------------------------------------- documents

  async listDocuments(
    tenantId: string,
    pilgrimId: string,
  ): Promise<PilgrimDocument[]> {
    const rows = await this.client.document.findMany({
      where: { tenantId, pilgrimId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row: any) => this.toDocument(row));
  }

  async findDocument(
    tenantId: string,
    id: string,
  ): Promise<PilgrimDocument | null> {
    const row = await this.client.document.findFirst({
      where: { id, tenantId },
    });
    return row ? this.toDocument(row) : null;
  }

  async createDocument(
    tenantId: string,
    pilgrimId: string,
    input: CreateDocumentInput,
  ): Promise<PilgrimDocument> {
    if (!(await this.findPilgrim(tenantId, pilgrimId))) {
      throw new HttpException('المعتمر غير موجود', HttpStatus.NOT_FOUND);
    }
    const row = await this.client.document.create({
      data: {
        tenantId,
        pilgrimId,
        type: input.type,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        ocrData: input.ocrData ?? undefined,
        verified: input.verified ?? false,
      },
    });
    return this.toDocument(row);
  }

  async setDocumentVerified(
    tenantId: string,
    id: string,
    verified: boolean,
  ): Promise<PilgrimDocument | null> {
    if (!(await this.findDocument(tenantId, id))) return null;
    const row = await this.client.document.update({
      where: { id },
      data: { verified },
    });
    return this.toDocument(row);
  }

  async deleteDocument(tenantId: string, id: string): Promise<boolean> {
    if (!(await this.findDocument(tenantId, id))) return false;
    await this.client.document.delete({ where: { id } });
    return true;
  }

  // ---------------------------------------------------------------- invoices

  async listInvoices(
    tenantId: string,
    query: InvoiceListQuery,
  ): Promise<Paginated<Invoice>> {
    const where = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [total, rows] = await this.client.$transaction([
      this.client.invoice.count({ where }),
      this.client.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      }),
    ]);
    return {
      items: rows.map((row: any) => this.toInvoice(row)),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async findInvoice(tenantId: string, id: string): Promise<Invoice | null> {
    const row = await this.client.invoice.findFirst({
      where: { id, tenantId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    return row ? this.toInvoice(row) : null;
  }

  async createInvoice(
    tenantId: string,
    input: CreateInvoiceInput,
  ): Promise<Invoice> {
    if (input.pilgrimId) {
      if (!(await this.findPilgrim(tenantId, input.pilgrimId))) {
        throw new HttpException('المعتمر غير موجود', HttpStatus.NOT_FOUND);
      }
    }

    const items = input.items.map((item, index) => ({
      description: item.description.trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: Math.round((item.quantity * item.unitPrice + Number.EPSILON) * 100) / 100,
      sortOrder: index,
    }));
    const subtotal =
      Math.round(
        (items.reduce((sum, item) => sum + item.lineTotal, 0) + Number.EPSILON) *
          100,
      ) / 100;
    const vatRate = input.vatRate ?? 0.15;
    const vatAmount = Math.round((subtotal * vatRate + Number.EPSILON) * 100) / 100;

    const row = await this.client.invoice.create({
      data: {
        tenantId,
        buyerName: input.buyerName.trim(),
        buyerVatNumber: input.buyerVatNumber?.trim() || null,
        pilgrimId: input.pilgrimId ?? null,
        currency: (input.currency ?? 'SAR').toUpperCase(),
        vatRate,
        subtotal,
        vatAmount,
        total: Math.round((subtotal + vatAmount + Number.EPSILON) * 100) / 100,
        notes: input.notes ?? null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        items: { create: items },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    return this.toInvoice(row);
  }

  async updateInvoice(
    tenantId: string,
    id: string,
    patch: Partial<Invoice>,
  ): Promise<Invoice | null> {
    if (!(await this.findInvoice(tenantId, id))) return null;

    await this.client.invoice.update({
      where: { id },
      data: {
        ...(patch.invoiceNumber !== undefined && {
          invoiceNumber: patch.invoiceNumber,
        }),
        ...(patch.uuid !== undefined && { uuid: patch.uuid }),
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.zatcaQr !== undefined && { zatcaQr: patch.zatcaQr }),
        ...(patch.zatcaHash !== undefined && { zatcaHash: patch.zatcaHash }),
        ...(patch.previousHash !== undefined && {
          previousHash: patch.previousHash,
        }),
        ...(patch.issuedAt !== undefined && {
          issuedAt: patch.issuedAt ? new Date(patch.issuedAt) : null,
        }),
        ...(patch.paidAt !== undefined && {
          paidAt: patch.paidAt ? new Date(patch.paidAt) : null,
        }),
      },
    });
    return this.findInvoice(tenantId, id);
  }

  async deleteInvoice(tenantId: string, id: string): Promise<boolean> {
    if (!(await this.findInvoice(tenantId, id))) return false;
    await this.client.invoice.delete({ where: { id } });
    return true;
  }

  async countIssuedInvoices(tenantId: string, year: number): Promise<number> {
    return this.client.invoice.count({
      where: {
        tenantId,
        status: { not: 'CANCELLED' },
        invoiceNumber: { startsWith: `INV-${year}-` },
      },
    });
  }

  async lastIssuedInvoice(tenantId: string): Promise<Invoice | null> {
    const row = await this.client.invoice.findFirst({
      where: { tenantId, zatcaHash: { not: null } },
      orderBy: { issuedAt: 'desc' },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    return row ? this.toInvoice(row) : null;
  }

  // ----------------------------------------------------------- tenants & auth

  async findTenantBySlug(slug: string): Promise<Tenant | null> {
    const row = await this.client.tenant.findUnique({
      where: { slug: slug.trim().toLowerCase() },
    });
    return row ? this.toTenant(row) : null;
  }

  async findTenantById(id: string): Promise<Tenant | null> {
    const row = await this.client.tenant.findUnique({ where: { id } });
    return row ? this.toTenant(row) : null;
  }

  async updateTenant(
    tenantId: string,
    patch: Partial<Tenant>,
  ): Promise<Tenant | null> {
    const exists = await this.findTenantById(tenantId);
    if (!exists) return null;
    const row = await this.client.tenant.update({
      where: { id: tenantId },
      data: {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.vatNumber !== undefined && {
          vatNumber: patch.vatNumber || null,
        }),
        ...(patch.crNumber !== undefined && {
          crNumber: patch.crNumber || null,
        }),
        ...(patch.addressLine !== undefined && {
          addressLine: patch.addressLine || null,
        }),
        ...(patch.city !== undefined && { city: patch.city || null }),
      },
    });
    return this.toTenant(row);
  }

  async createTenantWithAdmin(
    input: RegisterInput,
    passwordHash: string,
  ): Promise<{ tenant: Tenant; admin: User }> {
    const slug = input.slug.trim().toLowerCase();
    try {
      return await this.client.$transaction(async (tx: any) => {
        const tenantRow = await tx.tenant.create({
          data: { name: input.agencyName.trim(), slug, plan: 'FREE' },
        });
        const userRow = await tx.user.create({
          data: {
            tenantId: tenantRow.id,
            email: input.email.trim().toLowerCase(),
            passwordHash,
            name: input.name.trim(),
            role: 'ADMIN',
            phone: input.phone?.trim() || null,
          },
        });
        return { tenant: this.toTenant(tenantRow), admin: this.toUser(userRow) };
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new HttpException(
          'معرّف الوكالة (slug) أو البريد مستخدم مسبقاً',
          HttpStatus.CONFLICT,
        );
      }
      throw this.mapError(error);
    }
  }

  async findUsersByEmail(email: string): Promise<User[]> {
    const rows = await this.client.user.findMany({
      where: { email: email.trim().toLowerCase(), isActive: true },
    });
    return rows.map((row: any) => this.toUser(row));
  }

  async findUserById(id: string): Promise<User | null> {
    const row = await this.client.user.findUnique({ where: { id } });
    return row ? this.toUser(row) : null;
  }

  async listUsers(tenantId: string): Promise<User[]> {
    const rows = await this.client.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row: any) => this.toUser(row));
  }

  async touchLastLogin(userId: string, at: string): Promise<void> {
    await this.client.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(at) },
    });
  }

  async findIdentity(userId: string): Promise<AuthenticatedUser | null> {
    const row = await this.client.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    if (!row || !row.isActive) return null;
    if (row.tenant.status !== 'ACTIVE') return null;
    return {
      id: row.id,
      tenantId: row.tenantId,
      email: row.email,
      name: row.name,
      role: row.role,
    };
  }

  // ----------------------------------------------------------------- mapping

  private toPilgrimData(input: CreatePilgrimInput | UpdatePilgrimInput) {
    return {
      ...(input.fullNameAr !== undefined && { fullNameAr: input.fullNameAr }),
      ...(input.fullNameEn !== undefined && { fullNameEn: input.fullNameEn }),
      ...(input.passportNumber !== undefined && {
        passportNumber: input.passportNumber.toUpperCase(),
      }),
      ...(input.passportExpiry !== undefined && {
        passportExpiry: new Date(input.passportExpiry),
      }),
      ...(input.nationality !== undefined && {
        nationality: input.nationality.toUpperCase(),
      }),
      ...(input.dateOfBirth !== undefined && {
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      }),
      ...(input.gender !== undefined && { gender: input.gender }),
      ...(input.phone !== undefined && { phone: input.phone || null }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
    };
  }

  private toPilgrim(row: any): Pilgrim {
    return {
      ...row,
      passportExpiry: row.passportExpiry.toISOString(),
      dateOfBirth: row.dateOfBirth ? row.dateOfBirth.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toInvoice(row: any): Invoice {
    const num = (value: any) => (value === null || value === undefined ? null : Number(value));
    return {
      id: row.id,
      tenantId: row.tenantId,
      invoiceNumber: row.invoiceNumber ?? null,
      uuid: row.uuid ?? null,
      buyerName: row.buyerName,
      buyerVatNumber: row.buyerVatNumber ?? null,
      pilgrimId: row.pilgrimId ?? null,
      items: (row.items ?? []).map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
      currency: row.currency,
      vatRate: num(row.vatRate) ?? 0.15,
      subtotal: num(row.subtotal) ?? 0,
      vatAmount: num(row.vatAmount) ?? 0,
      total: num(row.total) ?? 0,
      status: row.status,
      zatcaQr: row.zatcaQr ?? null,
      zatcaHash: row.zatcaHash ?? null,
      previousHash: row.previousHash ?? null,
      notes: row.notes ?? null,
      issuedAt: row.issuedAt ? row.issuedAt.toISOString() : null,
      dueDate: row.dueDate ? row.dueDate.toISOString() : null,
      paidAt: row.paidAt ? row.paidAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDocument(row: any): PilgrimDocument {
    return {
      id: row.id,
      tenantId: row.tenantId,
      pilgrimId: row.pilgrimId,
      type: row.type,
      fileUrl: row.fileUrl,
      fileName: row.fileName,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
      ocrData: (row.ocrData as any) ?? null,
      verified: row.verified,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toTenant(row: any): Tenant {
    return {
      ...row,
      country: row.country ?? 'SA',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toUser(row: any): User {
    return {
      ...row,
      lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toGroup(row: any): Group {
    return {
      ...row,
      scheduledDate: row.scheduledDate
        ? row.scheduledDate.toISOString()
        : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      members: (row.members ?? []).map((member: any) => ({
        id: member.id,
        groupId: member.groupId,
        pilgrimId: member.pilgrimId,
        isLeader: member.isLeader,
        pilgrim: member.pilgrim
          ? {
              id: member.pilgrim.id,
              fullNameAr: member.pilgrim.fullNameAr,
              fullNameEn: member.pilgrim.fullNameEn,
              passportNumber: member.pilgrim.passportNumber,
              status: member.pilgrim.status,
            }
          : undefined,
      })),
    };
  }

  private mapError(error: any, passportNumber?: string): HttpException {
    if (error?.code === 'P2002') {
      return new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message: passportNumber
            ? `رقم الجواز ${passportNumber} مسجّل مسبقاً لهذه الوكالة`
            : 'قيمة مكررة',
          error: 'Conflict',
        },
        HttpStatus.CONFLICT,
      );
    }
    this.logger.error(error);
    return new HttpException(
      'حدث خطأ في قاعدة البيانات',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
