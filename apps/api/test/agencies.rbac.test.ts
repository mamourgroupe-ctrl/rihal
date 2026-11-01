import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../src/auth/auth.types';
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { REQUIRED_ROLES_KEY } from '../src/auth/auth.decorators';
import { AgenciesController } from '../src/agencies/agencies.controller';
import { RolesGuard } from '../src/auth/roles.guard';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';

vi.mock('../src/auth/auth.service', () => ({ AuthService: class AuthServiceMock {} }));

describe('AgenciesController RBAC metadata', () => {
  const reflector = new Reflector();

  it('allows every authenticated role to read the current subscription', () => {
    expect(
      reflector.getAllAndOverride(REQUIRED_ROLES_KEY, [
        AgenciesController.prototype.getCurrentSubscription,
        AgenciesController,
      ]),
    ).toEqual(['ADMIN', 'SUPERVISOR', 'OPERATOR', 'VIEWER']);
  });

  it('restricts subscription listing to ADMIN and SUPERVISOR', () => {
    expect(
      reflector.getAllAndOverride(REQUIRED_ROLES_KEY, [
        AgenciesController.prototype.listSubscriptions,
        AgenciesController,
      ]),
    ).toEqual(['ADMIN', 'SUPERVISOR']);
  });

  it('restricts subscription creation and updates to ADMIN', () => {
    expect(
      reflector.getAllAndOverride(REQUIRED_ROLES_KEY, [
        AgenciesController.prototype.createSubscription,
        AgenciesController,
      ]),
    ).toEqual(['ADMIN']);
    expect(
      reflector.getAllAndOverride(REQUIRED_ROLES_KEY, [
        AgenciesController.prototype.updateSubscription,
        AgenciesController,
      ]),
    ).toEqual(['ADMIN']);
  });
});

describe('AgenciesController RBAC guard behavior', () => {
  it('returns 403 when a VIEWER calls an ADMIN-only operation', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const request = {
      headers: {},
      auth: { sub: 'viewer', tenantId: 'tenant-a', role: 'VIEWER', sid: 'session' },
    } as unknown as AuthenticatedRequest;

    let thrown: unknown;
    try {
      guard.canActivate({
        getHandler: () => function handler() {},
        getClass: () => AgenciesController,
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext);
    } catch (error) {
      thrown = error;
    }

    expect((thrown as { getStatus?: () => number })?.getStatus?.()).toBe(403);
  });

  it('allows an ADMIN to call an ADMIN-only operation', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const request = {
      headers: {},
      auth: { sub: 'admin', tenantId: 'tenant-a', role: 'ADMIN', sid: 'session' },
    } as unknown as AuthenticatedRequest;

    expect(
      guard.canActivate({
        getHandler: () => function handler() {},
        getClass: () => AgenciesController,
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext),
    ).toBe(true);
  });

  it('returns 401 for a protected request without a bearer token', async () => {
    const reflector = {
      getAllAndOverride: vi.fn((key: string) =>
        key === 'auth:is-public' ? false : ['ADMIN'],
      ),
    } as unknown as Reflector;
    const auth = { isAccessSessionActive: vi.fn() };
    const jwt = { verifyAsync: vi.fn() };
    const guard = new JwtAuthGuard(reflector, jwt as never, auth as never);

    await expect(
      guard.canActivate({
        getHandler: () => function handler() {},
        getClass: () => AgenciesController,
        switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
      } as unknown as ExecutionContext),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
