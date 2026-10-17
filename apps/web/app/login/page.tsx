'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const DEMO_ACCOUNTS = [
  { email: 'admin@rihal.demo', title: 'مدير الوكالة', role: 'ADMIN — كامل الصلاحيات' },
  { email: 'operator@rihal.demo', title: 'منسّق العمليات', role: 'OPERATOR — إضافة وتعديل' },
  { email: 'supervisor@rihal.demo', title: 'مشرف المجموعات', role: 'SUPERVISOR — المجموعات والوثائق' },
  { email: 'viewer@rihal.demo', title: 'مطّلع', role: 'VIEWER — قراءة فقط' },
];

export default function LoginPage() {
  const { login, register, ready, user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking');
  const [healthAttempt, setHealthAttempt] = useState(0);

  useEffect(() => {
    if (ready && user) router.replace('/');
  }, [ready, user, router]);

  useEffect(() => {
    let alive = true;
    setHealth('checking');
    fetch('/api/health')
      .then((response) => {
        if (alive) setHealth(response.ok ? 'ok' : 'down');
      })
      .catch(() => {
        if (alive) setHealth('down');
      });
    return () => {
      alive = false;
    };
  }, [healthAttempt]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await login(String(form.get('email') ?? ''), String(form.get('password') ?? ''));
      // Navigation happens in the effect above once the user state is set,
      // so we never race the auth context with router.replace().
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'تعذّر الوصول إلى الخادم — تحقق من تشغيل الـ API ثم أعد المحاولة',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDemo(email: string) {
    setBusy(true);
    setError('');
    try {
      await login(email, 'Rihal@2026');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'تعذّر الوصول إلى الخادم — تحقق من تشغيل الـ API ثم أعد المحاولة',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await register({
        agencyName: String(form.get('agencyName') ?? ''),
        slug: String(form.get('slug') ?? '').toLowerCase(),
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذّر إنشاء الوكالة');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="brand-mark">🕌</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              رحال <span className="muted" style={{ fontSize: 15, fontWeight: 400 }}>Rihal</span>
            </div>
            <div className="text-xs muted">منصة عمليات وكالات الحج والعمرة</div>
          </div>
        </div>

        <div
          className="text-xs"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 12,
            color:
              health === 'ok'
                ? 'var(--green)'
                : health === 'down'
                  ? 'var(--danger)'
                  : 'var(--muted)',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: 'currentColor',
              display: 'inline-block',
            }}
          />
          {health === 'ok'
            ? 'الخادم متصل'
            : health === 'down'
              ? 'تعذّر الوصول إلى الخادم — شغّل pnpm dev:api'
              : 'جارٍ فحص الاتصال…'}
          {health === 'down' ? (
            <button
              type="button"
              onClick={() => setHealthAttempt((attempt) => attempt + 1)}
              style={{
                border: 0,
                background: 'transparent',
                color: 'var(--green)',
                fontSize: 11,
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              إعادة الفحص
            </button>
          ) : null}
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            وكالة جديدة
          </button>
        </div>

        {error ? <div className="form-error" style={{ marginBottom: 12 }}>{error}</div> : null}

        {mode === 'login' ? (
          <>
            <form className="auth-form" onSubmit={handleLogin}>
              <label className="field">
                البريد الإلكتروني
                <input
                  className="input"
                  name="email"
                  type="email"
                  required
                  placeholder="admin@rihal.demo"
                  dir="ltr"
                  autoComplete="username"
                  defaultValue="admin@rihal.demo"
                />
              </label>
              <label className="field">
                كلمة المرور
                <input
                  className="input"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  dir="ltr"
                  autoComplete="current-password"
                  defaultValue="Rihal@2026"
                />
              </label>
              <button type="submit" className="btn block" disabled={busy}>
                {busy ? 'جارٍ الدخول…' : 'دخول'}
              </button>
            </form>

            <div style={{ marginTop: 18, borderTop: '1px dashed var(--border)', paddingTop: 14 }}>
              <div className="text-xs muted" style={{ marginBottom: 8 }}>
                حسابات تجريبية — كلمة المرور: Rihal@2026
              </div>
              <div className="demo-grid">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    className="demo-btn"
                    disabled={busy}
                    onClick={() => handleDemo(account.email)}
                  >
                    <b>{account.title}</b>
                    {account.role}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <label className="field">
              اسم الوكالة
              <input
                className="input"
                name="agencyName"
                required
                minLength={2}
                placeholder="وكالة الأفق للعمرة"
              />
            </label>
            <label className="field">
              معرّف الوكالة (slug)
              <input
                className="input"
                name="slug"
                required
                minLength={3}
                maxLength={64}
                pattern="[a-z0-9][a-z0-9-]{1,62}[a-z0-9]"
                placeholder="alofuq"
                dir="ltr"
              />
            </label>
            <label className="field">
              اسم المدير
              <input className="input" name="name" required minLength={2} placeholder="أحمد العلي" />
            </label>
            <label className="field">
              البريد الإلكتروني
              <input className="input" name="email" type="email" required placeholder="admin@alofuq.demo" dir="ltr" />
            </label>
            <label className="field">
              كلمة المرور
              <input
                className="input"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="8 أحرف على الأقل، تتضمن حرفاً ورقماً"
                dir="ltr"
              />
            </label>
            <button type="submit" className="btn block" disabled={busy}>
              {busy ? 'جارٍ الإنشاء…' : 'إنشاء الوكالة والدخول'}
            </button>
          </form>
        )}

        <div className="text-xs muted" style={{ marginTop: 16, textAlign: 'center' }}>
          الإصدار {process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'}
        </div>
      </div>
    </div>
  );
}
