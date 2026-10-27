import type { Role } from '@rihal/database';
import type { Request } from 'express';

export const AUTH_ROLES = ['ADMIN', 'OPERATOR', 'SUPERVISOR', 'VIEWER'] as const satisfies readonly Role[];

export type AuthRole = (typeof AUTH_ROLES)[number];

export interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: AuthRole;
  sid: string;
}

export interface AuthTokenUser {
  id: string;
  tenantId: string;
  role: AuthRole;
  name: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthTokenUser;
}

export interface AuthTokenPair extends AuthTokenResponse {
  refreshToken: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthenticatedUser;
}
