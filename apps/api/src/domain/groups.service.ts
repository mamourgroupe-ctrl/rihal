import { Injectable } from '@nestjs/common';
import type { Group, GroupMember, GroupStatus } from '@rihal/database';
import { PrismaService } from '../database/prisma.service';
import { DomainRuleError } from './domain.errors';
import { assertGroupTransition } from './status-transitions';

export interface CreateGroupInput {
  name: string;
  description?: string | null;
  maxSize?: number;
  scheduledDate?: Date | null;
}

@Injectable()
export class GroupsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(tenantId: string, input: CreateGroupInput): Promise<Group> {
    const name = input.name.trim();
    const maxSize = input.maxSize ?? 4;
    if (!tenantId || !name || !Number.isInteger(maxSize) || maxSize < 1) {
      throw new DomainRuleError('INVALID_INPUT', 'A tenant, group name, and positive integer capacity are required.');
    }

    return this.prismaService.withRequestTenant(tenantId, (tx) => tx.group.create({
      data: {
        tenantId,
        name,
        description: input.description?.trim() || null,
        maxSize,
        scheduledDate: input.scheduledDate,
      },
    }));
  }

  async addMember(
    tenantId: string,
    groupId: string,
    pilgrimId: string,
    isLeader = false,
  ): Promise<GroupMember> {
    try {
      return await this.prismaService.withRequestTenant(tenantId, async (tx) => {
        const lockedGroups = await tx.$queryRaw<Array<{ id: string; maxSize: number; status: GroupStatus }>>`
          SELECT "id", "maxSize", "status"
          FROM "groups"
          WHERE "tenantId" = ${tenantId}
            AND "id" = ${groupId}
            AND "archivedAt" IS NULL
          FOR UPDATE
        `;
        const group = lockedGroups[0];
        if (!group) {
          throw new DomainRuleError('NOT_FOUND', 'Group not found.');
        }
        if (group.status !== 'DRAFT') {
          throw new DomainRuleError('INVALID_STATE_TRANSITION', 'Members can only be added to draft groups.');
        }

        const pilgrim = await tx.pilgrim.findFirst({
          where: { id: pilgrimId, tenantId, archivedAt: null },
          select: { id: true },
        });
        if (!pilgrim) {
          throw new DomainRuleError('NOT_FOUND', 'Pilgrim not found.');
        }

        const memberCount = await tx.groupMember.count({
          where: { tenantId, groupId, archivedAt: null },
        });
        if (memberCount >= group.maxSize) {
          throw new DomainRuleError('GROUP_FULL', 'The group has reached its maximum size.');
        }

        if (isLeader) {
          const existingLeader = await tx.groupMember.findFirst({
            where: { tenantId, groupId, archivedAt: null, isLeader: true },
            select: { id: true },
          });
          if (existingLeader) {
            throw new DomainRuleError('LEADER_ALREADY_ASSIGNED', 'The group already has an active leader.');
          }
        }

        return tx.groupMember.create({
          data: { tenantId, groupId, pilgrimId, isLeader },
        });
      });
    } catch (error) {
      const databaseError = getDatabaseError(error);
      if (databaseError?.code === 'P2002') {
        throw new DomainRuleError(
          isLeader ? 'LEADER_ALREADY_ASSIGNED' : 'CONFLICT',
          isLeader
            ? 'The group already has an active leader.'
            : 'The pilgrim is already an active member of this group.',
        );
      }
      if (databaseError?.code === 'P2003') {
        throw new DomainRuleError('INVALID_ASSOCIATION', 'Group and pilgrim must belong to the same tenant.');
      }
      if (
        databaseError?.code === 'P2004' &&
        databaseError.message.includes('group_members_max_size')
      ) {
        throw new DomainRuleError('GROUP_FULL', 'The group has reached its maximum size.');
      }
      throw error;
    }
  }

  async removeMember(tenantId: string, groupId: string, memberId: string): Promise<void> {
    await this.prismaService.withRequestTenant(tenantId, async (tx) => {
      const result = await tx.groupMember.updateMany({
        where: { id: memberId, tenantId, groupId, archivedAt: null },
        data: { archivedAt: new Date() },
      });
      if (result.count !== 1) {
        throw new DomainRuleError('NOT_FOUND', 'Active group member not found.');
      }
    });
  }

  async transitionStatus(
    tenantId: string,
    groupId: string,
    nextStatus: GroupStatus,
  ): Promise<Group> {
    return this.prismaService.withRequestTenant(tenantId, async (tx) => {
      const lockedGroups = await tx.$queryRaw<Array<{ id: string; status: GroupStatus }>>`
        SELECT "id", "status"
        FROM "groups"
        WHERE "tenantId" = ${tenantId}
          AND "id" = ${groupId}
          AND "archivedAt" IS NULL
        FOR UPDATE
      `;
      const group = lockedGroups[0];
      if (!group) {
        throw new DomainRuleError('NOT_FOUND', 'Group not found.');
      }

      assertGroupTransition(group.status, nextStatus);
      if (nextStatus === 'READY') {
        const memberCount = await tx.groupMember.count({
          where: { tenantId, groupId, archivedAt: null },
        });
        const leader = await tx.groupMember.findFirst({
          where: { tenantId, groupId, archivedAt: null, isLeader: true },
          select: { id: true },
        });
        if (memberCount === 0 || !leader) {
          throw new DomainRuleError(
            'INVALID_STATE_TRANSITION',
            'A group must have at least one member and one leader before it can become ready.',
          );
        }
      }

      const updated = await tx.group.updateMany({
        where: { id: groupId, tenantId, status: group.status, archivedAt: null },
        data: { status: nextStatus },
      });
      if (updated.count !== 1) {
        throw new DomainRuleError('CONFLICT', 'Group state changed concurrently.');
      }
      return tx.group.findFirstOrThrow({ where: { id: groupId, tenantId, archivedAt: null } });
    });
  }

  async archive(tenantId: string, groupId: string): Promise<void> {
    await this.prismaService.withRequestTenant(tenantId, async (tx) => {
      const archivedAt = new Date();
      const group = await tx.group.updateMany({
        where: { id: groupId, tenantId, archivedAt: null },
        data: { archivedAt },
      });
      if (group.count !== 1) {
        throw new DomainRuleError('NOT_FOUND', 'Group not found.');
      }
      await tx.groupMember.updateMany({
        where: { tenantId, groupId, archivedAt: null },
        data: { archivedAt },
      });
    });
  }
}

function getDatabaseError(error: unknown): { code: string; message: string } | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code !== 'string') {
    return undefined;
  }
  const meta = (error as { meta?: unknown }).meta;
  const databaseError =
    typeof meta === 'object' && meta !== null && 'database_error' in meta
      ? String((meta as { database_error?: unknown }).database_error ?? '')
      : '';
  return { code, message: databaseError };
}
