import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/auth/auth.service', () => ({ AuthService: class AuthServiceMock {} }));

import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import type { AuthenticatedRequest } from '../src/auth/auth.types';

function executionContext(request: AuthenticatedRequest): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class TestController {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('authentication guards', () => {
  it('returns HTTP 401 for a protected request without a bearer token', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const jwt = { verifyAsync: vi.fn() };
    const auth = { isAccessSessionActive: vi.fn() };
    const guard = new JwtAuthGuard(reflector, jwt as never, auth as never);

    await expect(guard.canActivate(executionContext({ headers: {} } as AuthenticatedRequest)))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('allows explicitly public routes without requiring a token', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const jwt = { verifyAsync: vi.fn() };
    const auth = { isAccessSessionActive: vi.fn() };
    const guard = new JwtAuthGuard(reflector, jwt as never, auth as never);

    await expect(guard.canActivate(executionContext({ headers: {} } as AuthenticatedRequest)))
      .resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('returns HTTP 403 when the authenticated role is insufficient', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const request = {
      headers: {},
      auth: { sub: 'user-test', tenantId: 'tenant-test', role: 'VIEWER', sid: 'session-test' },
    } as AuthenticatedRequest;

    let thrown: unknown;
    try {
      guard.canActivate(executionContext(request));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ForbiddenException);
    expect((thrown as ForbiddenException).getStatus()).toBe(403);
  });
});
