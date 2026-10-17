'use client';

import { useEffect, useState } from 'react';
import { Badge, PageHeader, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/format';
import type { Tenant } from '@/lib/types';

const PLAN_LABELS: Record<Tenant['plan'], string> = {
  FREE: 'مجانية',
  BASIC: 'أساسية',
  PRO: 'احترافية',
  ENTERPRISE: 'مؤسسية',
};

export default function SettingsPage() {
  const { tenant, role, user, canManage, refreshTenant } = useAuth();
  const { notify } = useToast();

  const [form, setForm] = useState({
    name: '',
    vatNumber: '',
    crNumber: '',
    addressLine: '',
    city: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenant) return;
    setForm({
      name: tenant.name ?? '',
      vatNumber: tenant.vatNumber ?? '',
      crNumber: tenant.crNumber ?? '',
      addressLine: tenant.addressLine ?? '',
      city: tenant.city ?? '',
    });
  }, [tenant]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload: Record<string, string> = { name: form.name.trim() };
      for (const key of ['vatNumber', 'crNumber', 'addressLine', 'city'] as const) {
        const value = form[key].trim();
        // Empty optional fields are rejected by the API pattern rules, so send them only when filled.
        if (value) payload[key] = value;
      }
      await api<Tenant>('/tenant', { method: 'PATCH', body: payload });
      await refreshTenant();
      notify('تم حفظ بيانات الوكالة');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر الحفظ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="الإعدادات"
        subtitle="بيانات الوكالة تظهر كمُصدِر على كل فاتورة ZATCA"
      />

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        <section className="panel">
          <div className="panel-head">
            <h2 className="h2">ملف الوكالة</h2>
            <span style={{ marginInlineStart: 'auto' }}>
              <Badge tone={tenant?.status === 'ACTIVE' ? 'green' : 'red'}>
                {tenant?.status === 'ACTIVE' ? 'نشط' : tenant?.status ?? '—'}
              </Badge>
            </span>
          </div>
          <div className="panel-body">
            {!canManage ? (
              <div
                style={{
                  marginBottom: 14,
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(217,179,108,0.28)',
                  background: 'rgba(217,179,108,0.08)',
                  fontSize: 12,
                  color: 'var(--gold)',
                }}
              >
                التعديل متاح لمدير الوكالة فقط — يمكنك الاطلاع على البيانات الحالية.
              </div>
            ) : null}

            {error ? <div className="form-error">{error}</div> : null}

            <form className="form-grid" onSubmit={handleSubmit}>
              <label className="field full">
                اسم الوكالة *
                <input
                  className="input"
                  required
                  minLength={2}
                  maxLength={120}
                  disabled={!canManage}
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                />
              </label>
              <label className="field">
                الرقم الضريبي (15 رقماً)
                <input
                  className="input"
                  dir="ltr"
                  inputMode="numeric"
                  pattern="\d{15}"
                  maxLength={15}
                  disabled={!canManage}
                  placeholder="310123456700003"
                  value={form.vatNumber}
                  onChange={(event) => update('vatNumber', event.target.value.replace(/\D/g, ''))}
                />
              </label>
              <label className="field">
                السجل التجاري (10 أرقام)
                <input
                  className="input"
                  dir="ltr"
                  inputMode="numeric"
                  pattern="\d{10}"
                  maxLength={10}
                  disabled={!canManage}
                  placeholder="1010123456"
                  value={form.crNumber}
                  onChange={(event) => update('crNumber', event.target.value.replace(/\D/g, ''))}
                />
              </label>
              <label className="field">
                المدينة
                <input
                  className="input"
                  minLength={2}
                  maxLength={80}
                  disabled={!canManage}
                  value={form.city}
                  onChange={(event) => update('city', event.target.value)}
                />
              </label>
              <label className="field">
                العنوان
                <input
                  className="input"
                  maxLength={200}
                  disabled={!canManage}
                  placeholder="شارع الملك فهد، حي العليا"
                  value={form.addressLine}
                  onChange={(event) => update('addressLine', event.target.value)}
                />
              </label>

              {canManage ? (
                <div className="full" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="submit" className="btn" disabled={busy}>
                    {busy ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
                  </button>
                </div>
              ) : null}
            </form>
          </div>
        </section>

        <div className="grid" style={{ gap: 14, alignContent: 'start' }}>
          <section className="panel">
            <div className="panel-head">
              <h2 className="h2">حسابي</h2>
            </div>
            <div className="panel-body grid" style={{ gap: 9, fontSize: 13 }}>
              <InfoRow label="الاسم" value={user?.name ?? '—'} />
              <InfoRow label="البريد" value={<span className="mono">{user?.email ?? '—'}</span>} />
              <InfoRow label="الدور" value={role ? ROLE_LABELS[role] : '—'} />
              <InfoRow label="المُعرّف" value={<span className="mono">{tenant?.slug ?? '—'}</span>} />
              <InfoRow label="الخطة" value={tenant ? PLAN_LABELS[tenant.plan] : '—'} />
              <InfoRow label="الدولة" value={tenant?.country ?? '—'} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="h2">جاهزية ZATCA</h2>
            </div>
            <div className="panel-body grid" style={{ gap: 9, fontSize: 12.5 }}>
              <Readiness label="الرقم الضريبي" ok={Boolean(tenant?.vatNumber)} />
              <Readiness label="السجل التجاري" ok={Boolean(tenant?.crNumber)} />
              <Readiness label="العنوان الوطني" ok={Boolean(tenant?.addressLine && tenant?.city)} />
              <p className="text-xs muted" style={{ margin: '4px 0 0', lineHeight: 1.7 }}>
                تكتمل هذه البيانات من ملف الوكالة، وتُطبع على الفاتورة ورمز QR.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span className="muted">{label}</span>
      <span style={{ textAlign: 'left' }}>{value}</span>
    </div>
  );
}

function Readiness({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span className="muted">{label}</span>
      <span style={{ color: ok ? 'var(--green)' : 'var(--gold)' }}>{ok ? 'مكتمل ✓' : 'ناقص !'}</span>
    </div>
  );
}
