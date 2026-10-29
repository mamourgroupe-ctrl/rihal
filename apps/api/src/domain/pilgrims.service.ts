import { Injectable } from '@nestjs/common';
import type { Gender, Pilgrim, PilgrimStatus } from '@rihal/database';
import { PrismaService } from '../database/prisma.service';
import { DomainRuleError } from './domain.errors';
import { assertPilgrimTransition } from './status-transitions';

export interface CreatePilgrimInput {
  fullNameAr: string;
  fullNameEn: string;
  passportNumber: string;
  passportExpiry: Date;
  nationality: string;
  dateOfBirth?: Date | null;
  gender?: Gender | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

@Injectable()
export class PilgrimsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(tenantId: string, input: CreatePilgrimInput): Promise<Pilgrim> {
    const passportNumber = input.passportNumber.trim().toUpperCase();
    if (!tenantId || !passportNumber || !input.fullNameAr.trim() || !input.fullNameEn.trim()) {
      throw new DomainRuleError('INVALID_INPUT', 'Tenant, names, and passport number are required.');
    }

    return this.prismaService.withTenant(tenantId, (tx) => tx.pilgrim.create({
      data: {
        tenantId,
        fullNameAr: input.fullNameAr.trim(),
        fullNameEn: input.fullNameEn.trim(),
        passportNumber,
        passportExpiry: input.passportExpiry,
        nationality: input.nationality.trim().toUpperCase(),
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        phone: input.phone?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
        notes: input.notes?.trim() || null,
      },
    }));
  }

  async transitionStatus(
    tenantId: string,
    pilgrimId: string,
    nextStatus: PilgrimStatus,
  ): Promise<Pilgrim> {
    return this.prismaService.withTenant(tenantId, async (tx) => {
      const pilgrim = await tx.pilgrim.findFirst({
        where: { id: pilgrimId, tenantId, archivedAt: null },
      });
      if (!pilgrim) {
        throw new DomainRuleError('NOT_FOUND', 'Pilgrim not found.');
      }

      assertPilgrimTransition(pilgrim.status, nextStatus);
      const updated = await tx.pilgrim.updateMany({
        where: {
          id: pilgrim.id,
          tenantId,
          status: pilgrim.status,
          archivedAt: null,
        },
        data: { status: nextStatus },
      });
      if (updated.count !== 1) {
        throw new DomainRuleError('CONFLICT', 'Pilgrim state changed concurrently.');
      }

      return tx.pilgrim.findFirstOrThrow({
        where: { id: pilgrimId, tenantId, archivedAt: null },
      });
    });
  }

  async archive(tenantId: string, pilgrimId: string): Promise<void> {
    await this.prismaService.withTenant(tenantId, async (tx) => {
      const archivedAt = new Date();
      const result = await tx.pilgrim.updateMany({
        where: { id: pilgrimId, tenantId, archivedAt: null },
        data: { archivedAt },
      });
      if (result.count !== 1) {
        throw new DomainRuleError('NOT_FOUND', 'Pilgrim not found.');
      }
      await tx.groupMember.updateMany({
        where: { tenantId, pilgrimId, archivedAt: null },
        data: { archivedAt },
      });
      await tx.document.updateMany({
        where: { tenantId, pilgrimId, archivedAt: null },
        data: { archivedAt },
      });
      await tx.notification.updateMany({
        where: { tenantId, pilgrimId, archivedAt: null },
        data: { archivedAt },
      });
    });
  }
}
