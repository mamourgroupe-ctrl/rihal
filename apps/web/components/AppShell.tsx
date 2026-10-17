'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { ROLE_LABELS, initials } from '@/lib/format';

const NAV = [
  { href: '/', label: 'نظرة عامة', icon: '◈' },
  { href: '/pilgrims', label: 'المعتمرون', icon: '☰' },
  { href: '/groups', label: 'المجموعات', icon: '⛭' },
  { href: '/invoices', label: 'الفوترة', icon: '▤' },
  { href: '/settings', label: 'إعدادات الوكالة', icon: '⚙' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, user, tenant, role, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="empty" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        جارٍ تحميل الجلسة…
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="shell">
      {menuOpen ? (
        <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />
      ) : null}

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">🕌</div>
          <div>
            <div className="brand-title">رحال</div>
            <div className="brand-sub">{tenant?.name ?? 'Rihal'}</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="user-box">
            <div className="avatar">{initials(user.name)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </div>
              <div className="text-xs muted">{role ? ROLE_LABELS[role] : ''}</div>
            </div>
          </div>
          <button type="button" className="btn ghost small block" onClick={logout}>
            تسجيل الخروج
          </button>
          <div className="text-xs muted" style={{ textAlign: 'center' }}>
            Rihal v0.4 · {tenant?.plan ?? 'FREE'}
          </div>
        </div>
      </aside>

      <main className="main">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            type="button"
            className="btn ghost small mobile-toggle"
            onClick={() => setMenuOpen(true)}
          >
            ☰ القائمة
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
