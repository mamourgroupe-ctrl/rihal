'use client';

const TOKEN_KEY = 'rihal_token';

export function getToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage disabled */
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage disabled */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

/**
 * Talks to `/api` on the same origin — Next.js rewrites it to the NestJS API,
 * so the browser never needs to know the backend host or port.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 401) {
    clearToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError('انتهت الجلسة — سجّل الدخول من جديد', 401);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message = (body as { message?: string | string[] } | null)?.message;
    const resolved = Array.isArray(message) ? message.join(' · ') : message;
    throw new ApiError(resolved || 'تعذّر إكمال الطلب', response.status);
  }

  return body as T;
}

/** Multipart upload (documents). */
export async function upload<T>(path: string, form: FormData): Promise<T> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set('authorization', `Bearer ${token}`);

  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers,
    body: form,
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new ApiError('انتهت الجلسة', 401);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.message;
    throw new ApiError(
      Array.isArray(message) ? message.join(' · ') : message || 'فشل الرفع',
      response.status,
    );
  }
  return body as T;
}

/** Fetches a protected resource and returns an object URL (e.g. inline QR image). */
export async function fetchBlobUrl(path: string): Promise<string> {
  const token = getToken();
  const response = await fetch(`/api${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new ApiError('تعذّر تحميل الملف', response.status);
  return URL.createObjectURL(await response.blob());
}

/** Downloads a file with the bearer token and triggers a browser download. */
export async function download(path: string, filename: string): Promise<void> {
  const token = getToken();
  const response = await fetch(`/api${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new ApiError('تعذّر تنزيل الملف', response.status);

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
