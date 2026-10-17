'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Kpi, Loading, PageHeader, Progress } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  GROUP_LABELS,
  GROUP_TONE,
  INVOICE_LABELS,
  PILGRIM_COLORS,
  PILGRIM_LABELS,
  PILGRIM_TONE,
  formatDate,
  money,
} from '@/lib/format';
import type {
  DashboardStats,
  Group,
  Invoice,
  InvoiceStats,
  Paginated,
  Pilgrim,
} from '@/lib/types';

export default function OverviewPage() {
  const { user, tenant, canWrite } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pilgrims, setPilgrims] = useState<Paginated<Pilgrim> | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [billing, setBilling] = useState<InvoiceStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statsRes, pilgrimsRes, groupsRes, invoicesRes, billingRes] =
          await Promise.all([
            api<DashboardStats>('/dashboard'),
            api<Paginated<Pilgrim>>('/pilgrims?limit=5'),
            api<Group[]>('/groups'),
            api<Paginated<Invoice>>('/invoices?limit=3'),
            api<InvoiceStats>('/invoices/stats'),
          ]);
        if (cancelled) return;
        setStats(statsRes);
        setPilgrims(pilgrimsRes);
        setGroups(groupsRes.slice(0, 3));
        setRecentInvoices(invoicesRes.items);
        setBilling(billingRes);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'تعذّر تحميل البيانات');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = stats?.pilgrims.total ?? 0;

  return (
    <>
      <PageHeader
        title={`أهلاً، ${user?.name.split(' ')[0] ?? ''}`}
        subtitle={`${tenant?.name ?? ''} — ملخص موسم ${new Date().getFullYear()}`}
        actions={
          canWrite ? (
            <>
              <Link className="btn ghost small" href="/groups">
                المجموعات
              </Link>
              <Link className="btn small" href="/pilgrims">
                + معتمر جديد
              </Link>
            </>
          ) : null
        }
      />

      {error ? <div className="form-error" style={{ marginBottom: 14 }}>{error}</div> : null}

      <section className="grid kpis">
        <Kpi
          label="إجمالي المعتمرين"
          value={stats ? total : '—'}
          hint={stats ? `${stats.pilgrims.documentsPending} بانتظار الوثائق` : undefined}
        />
        <Kpi
          label="جاهزون للحجز"
          value={stats ? stats.pilgrims.readyForBooking : '—'}
          tone="accent"
          hint="وثائق مكتملة وموثّقة"
        />
        <Kpi
          label="مقاعد متاحة"
          value={stats ? stats.groups.openSlots : '—'}
          tone="gold"
          hint={stats ? `${stats.groups.total} مجموعة` : undefined}
        />
        <Kpi
          label="جوازات تنتهي قريباً"
          value={stats ? stats.passportsExpiringSoon : '—'}
          hint="خلال 6 أشهر"
        />
      </section>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', marginTop: 14 }}>
        <section className="panel" style={{ minWidth: 0 }}>
          <div className="panel-head">
            <h2 className="h2">أحدث المعتمرين</h2>
            <Link href="/pilgrims" className="btn ghost small" style={{ marginInlineStart: 'auto' }}>
              عرض الكل
            </Link>
          </div>

          {stats && total > 0 ? (
            <div className="statusbar">
              {Object.entries(stats.pilgrims.byStatus).map(([key, value]) =>
                value ? (
                  <span
                    key={key}
                    title={`${PILGRIM_LABELS[key as keyof typeof PILGRIM_LABELS]}: ${value}`}
                    style={{
                      flex: Math.max(2, Math.round((value / total) * 100)),
                      background: PILGRIM_COLORS[key as keyof typeof PILGRIM_COLORS],
                    }}
                  />
                ) : null,
              )}
            </div>
          ) : null}

          {!pilgrims ? (
            <Loading />
          ) : pilgrims.items.length === 0 ? (
            <div className="empty">
              لا يوجد معتمرون بعد —{' '}
              <Link href="/pilgrims" style={{ color: 'var(--green)' }}>
                أضف أول معتمر
              </Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>المعتمر</th>
                    <th className="hide-sm">الجواز</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {pilgrims.items.map((pilgrim) => (
                    <tr key={pilgrim.id}>
                      <td>
                        <Link href={`/pilgrims/${pilgrim.id}`}>
                          <div className="cell-main">{pilgrim.fullNameAr}</div>
                          <div className="cell-sub">{pilgrim.fullNameEn}</div>
                        </Link>
                      </td>
                      <td className="hide-sm">
                        <span className="mono">{pilgrim.passportNumber}</span>
                      </td>
                      <td>
                        <Badge tone={PILGRIM_TONE[pilgrim.status]}>
                          {PILGRIM_LABELS[pilgrim.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid">
          <section className="panel">
            <div className="panel-head">
              <h2 className="h2">المجموعات</h2>
              <Link href="/groups" className="btn ghost small" style={{ marginInlineStart: 'auto' }}>
                إدارة
              </Link>
            </div>
            <div className="panel-body grid" style={{ gap: 12 }}>
              {groups.length === 0 ? (
                <div className="text-sm muted">لا توجد مجموعات بعد</div>
              ) : (
                groups.map((group) => (
                  <div key={group.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{group.name}</div>
                      <Badge tone={GROUP_TONE[group.status]}>{GROUP_LABELS[group.status]}</Badge>
                    </div>
                    <div className="text-xs muted" style={{ margin: '3px 0 6px' }}>
                      {group.members.length} / {group.maxSize} عضو · {formatDate(group.scheduledDate)}
                    </div>
                    <Progress percent={(group.members.length / group.maxSize) * 100} />
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="h2">الفوترة</h2>
              <Link href="/invoices" className="btn ghost small" style={{ marginInlineStart: 'auto' }}>
                التفاصيل
              </Link>
            </div>
            <div className="panel-body grid" style={{ gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span className="muted">محصّل</span>
                <span className="money" style={{ color: 'var(--green)', fontWeight: 700 }}>
                  {money(billing?.paidAmount ?? 0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span className="muted">مستحق</span>
                <span className="money" style={{ color: 'var(--gold)' }}>
                  {money(billing?.issuedAmount ?? 0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span className="muted">ضريبة القيمة المضافة</span>
                <span className="money">{money(billing?.vatCollected ?? 0)}</span>
              </div>
              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8, display: 'grid', gap: 6 }}>
                {recentInvoices.length === 0 ? (
                  <div className="text-xs muted">لا توجد فواتير بعد</div>
                ) : (
                  recentInvoices.map((invoice) => (
                    <div key={invoice.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5 }}>
                      <span className="mono" style={{ color: 'var(--muted)' }}>
                        {invoice.invoiceNumber ?? 'مسودة'}
                      </span>
                      <Badge tone={invoice.status === 'PAID' ? 'green' : invoice.status === 'ISSUED' ? 'blue' : 'gray'}>
                        {INVOICE_LABELS[invoice.status]}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
