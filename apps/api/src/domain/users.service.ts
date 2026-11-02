import { Injectable } from '@nestjs/common';
import type { Prisma, Role } from '@rihal/database';
import { hash } from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { DomainRuleError } from './domain.errors';

const BCRYPT_COST = 12;

export interface CreateUserInput {
  email: string;
  name: string;
  role: Role;
  password: string;
  phone?: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(tenantId: string) {
    return this.prismaService.withTenant(tenantId, (tx) =>
      tx.user.findMany({
        where: { tenantId, archivedAt: null },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
    );
  }

  async create(tenantId: string, input: CreateUserInput) {
    const email = input.email.trim().toLowerCase();
    if (!email || !input.name.trim() || input.password.length < 12) {
      throw new DomainRuleError(
        'INVALID_INPUT',
        'A name, email, and a password of at least 12 characters are required.',
      );
    }

    const existing = await this.prismaService.withTenant(tenantId, (tx) =>
      tx.user.findFirst({ where: { tenantId, email }, select: { id: true } }),
    );
    if (existing) {
      throw new DomainRuleError('CONFLICT', 'A user with this email already exists in the agency.');
    }

    const passwordHash = await hash(input.password, BCRYPT_COST);
    return this.prismaService.withTenant(tenantId, (tx) =>
      tx.user.create({
        data: {
          tenantId,
          email,
          name: input.name.trim(),
          role: input.role,
          passwordHash,
          phone: input.phone?.trim() || null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
      }),
    );
  }

  async update(
    tenantId: string,
    userId: string,
    input: { role?: Role; isActive?: boolean; name?: string; phone?: string | null },
  ) {
    const data: Prisma.UserUpdateManyMutationInput = {
      ...(input.role ? { role: input.role } : {}),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.phone === undefined ? {} : { phone: input.phone?.trim() || null }),
    };

    return this.prismaService.withTenant(tenantId, async (tx) => {
      const updated = await tx.user.updateMany({
        where: { id: userId, tenantId, archivedAt: null },
        data,
      });
      if (updated.count !== 1) {
        throw new DomainRuleError('NOT_FOUND', 'User not found.');
      }
      // Deactivating or demoting a user must not leave live sessions behind.
      if (input.isActive === false || input.role) {
        await tx.authSession.updateMany({
          where: { tenantId, userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return tx.user.findFirstOrThrow({
        where: { id: userId, tenantId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
      });
    });
  }
}
