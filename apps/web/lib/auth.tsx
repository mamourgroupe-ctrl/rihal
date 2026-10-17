'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from './api';
import type { AuthSession, Role, Tenant, User } from './types';

interface AuthContextValue {
  ready: boolean;
  user: User | null;
  tenant: Tenant | null;
  role: Role | null;
  canWrite: boolean;
  canVerify: boolean;
  canIssue: boolean;
  canManage: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshTenant: () => Promise<void>;
}

export interface RegisterPayload {
  agencyName: string;
  slug: string;
  name: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resume = async () => {
      if (!getToken()) {
        setReady(true);
        return;
      }
      try {
        const session = await api<{ user: User; tenant: Tenant }>('/auth/me');
        if (cancelled) return;
        setUser(session.user);
        setTenant(session.tenant);
      } catch {
        clearToken();
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void resume();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await api<AuthSession>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setToken(session.accessToken);
    setUser(session.user);
    setTenant(session.tenant);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const session = await api<AuthSession>('/auth/register', {
      method: 'POST',
      body: payload,
    });
    setToken(session.accessToken);
    setUser(session.user);
    setTenant(session.tenant);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setTenant(null);
    window.location.href = '/login';
  }, []);

  const refreshTenant = useCallback(async () => {
    const fresh = await api<Tenant>('/tenant');
    setTenant(fresh);
  }, []);

  const role = user?.role ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      tenant,
      role,
      canWrite: role === 'ADMIN' || role === 'OPERATOR' || role === 'SUPERVISOR',
      canVerify: role === 'ADMIN' || role === 'SUPERVISOR',
      canIssue: role === 'ADMIN' || role === 'OPERATOR',
      canManage: role === 'ADMIN',
      login,
      register,
      logout,
      refreshTenant,
    }),
    [ready, user, tenant, role, login, register, logout, refreshTenant],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
