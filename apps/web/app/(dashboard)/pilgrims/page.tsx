'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Loading, Modal, PageHeader, useToast } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  PILGRIM_LABELS,
  PILGRIM_TONE,
  formatDate,
} from '@/lib/format';
import type { Paginated, Pilgrim, PilgrimStatus } from '@/lib/types';

const STATUS_OPTIONS = Object.keys(PILGRIM_LABELS) as PilgrimStatus[];

export default function PilgrimsPage() {
  const { canWrite } = useAuth();
  const { notify } = useToast();

  const [data, setData] = useState<Paginated<Pilgrim> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const result = await api<Paginated<Pilgrim>>(`/pilgrims?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل المعتمرين');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> = {};
    form.forEach((value, key) => {
      if (String(value).trim() !== '') payload[key] = String(value).trim();
    });

    setBusy(true);
    setCreateError('');
    try {
      await api<Pilgrim>('/pilgrims', { method: 'POST', body: payload });
      setCreateOpen(false);
      notify('تمت إضافة المعتمر');
      setPage(1);
      await load();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'تعذّر الحفظ');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(pilgrim: Pilgrim) {
    if (!window.confirm(`حذف ${pilgrim.fullNameAr} نهائياً؟`)) return;
    try {
      await api(`/pilgrims/${pilgrim.id}`, { method: 'DELETE' });
      notify('تم حذف المعتمر');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تعذّر الحذف', true);
    }
  }

  return (
    <>
      <PageHeader
        title="المعتمرون"
        subtitle={data ? `${data.total} سجل · صفحة ${data.page} من ${data.pages}` : 'جارٍ التحميل…'}
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              className="input"
              style={{ minWidth: 220 }}
              placeholder="بحث بالاسم أو رقم الجواز…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <select
              className="select"
              style={{ width: 170 }}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">كل الحالات</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {PILGRIM_LABELS[option]}
                </option>
              ))}
            </select>
            {canWrite ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setCreateError('');
                  setCreateOpen(true);
                }}
              >
                + معتمر جديد
              </button>
            ) : null}
          </div>
        }
      />

      {error ? <div className="form-error" style={{ marginBottom: 14 }}>{error}</div> : null}

      <section className="panel">
        {loading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <div className="empty">
            {search || status ? 'لا نتائج مطابقة للبحث' : 'لا يوجد معتمرون بعد'}
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>المعتمر</th>
                    <th>الجواز</th>
                    <th className="hide-sm">الجنسية</th>
                    <th className="hide-sm">انتهاء الجواز</th>
                    <th>الحالة</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((pilgrim) => {
                    const expiry = new Date(pilgrim.passportExpiry).getTime();
                    const soon = expiry < Date.now() + 180 * 86_400_000;
                    return (
                      <tr key={pilgrim.id}>
                        <td>
                          <Link href={`/pilgrims/${pilgrim.id}`}>
                            <div className="cell-main">{pilgrim.fullNameAr}</div>
                            <div className="cell-sub">{pilgrim.fullNameEn}</div>
                          </Link>
                        </td>
                        <td>
                          <span className="mono">{pilgrim.passportNumber}</span>
                          <div className="cell-sub">{pilgrim.phone ?? ''}</div>
                        </td>
                        <td className="hide-sm">{pilgrim.nationality}</td>
                        <td className="hide-sm">
                          {formatDate(pilgrim.passportExpiry)}
                          {soon ? <div className="text-xs" style={{ color: 'var(--gold)' }}>قريب الانتهاء</div> : null}
                        </td>
                        <td>
                          <Badge tone={PILGRIM_TONE[pilgrim.status]}>{PILGRIM_LABELS[pilgrim.status]}</Badge>
                        </td>
                        <td>
                          <div className="row-actions">
                            <Link className="btn ghost small" href={`/pilgrims/${pilgrim.id}`}>
                              الملف والوثائق
                            </Link>
                            {canWrite ? (
                              <button
                                type="button"
                                className="btn danger small"
                                onClick={() => handleDelete(pilgrim)}
                              >
                                حذف
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pager">
              <span>
                صفحة {data.page} من {data.pages} · {data.total} سجل
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={data.page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  السابق
                </button>
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={data.page >= data.pages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  التالي
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <Modal
        open={createOpen}
        title="إضافة معتمر"
        subtitle="حقول الجواز مطلوبة — يمكن رفع الوثائق بعد الحفظ"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button type="button" className="btn ghost" onClick={() => setCreateOpen(false)}>
              إلغاء
            </button>
            <button type="submit" form="create-pilgrim" className="btn" disabled={busy}>
              {busy ? 'جارٍ الحفظ…' : 'حفظ المعتمر'}
            </button>
          </>
        }
      >
        {createError ? <div className="form-error">{createError}</div> : null}
        <form id="create-pilgrim" className="form-grid" onSubmit={handleCreate}>
          <label className="field full">
            الاسم الكامل (عربي) *
            <input className="input" name="fullNameAr" required minLength={2} maxLength={120} placeholder="عبد الله محمد العتيبي" />
          </label>
          <label className="field full">
            الاسم الكامل (إنجليزي) *
            <input className="input" name="fullNameEn" required minLength={2} maxLength={120} placeholder="Abdullah Mohammed Al-Otaibi" dir="ltr" />
          </label>
          <label className="field">
            رقم الجواز *
            <input className="input" name="passportNumber" required minLength={5} maxLength={20} placeholder="A1234567" dir="ltr" />
          </label>
          <label className="field">
            انتهاء الجواز *
            <input className="input" name="passportExpiry" type="date" required />
          </label>
          <label className="field">
            الجنسية *
            <input className="input" name="nationality" required minLength={2} maxLength={3} placeholder="SAU" dir="ltr" />
          </label>
          <label className="field">
            الجنس
            <select className="select" name="gender" defaultValue="">
              <option value="">—</option>
              <option value="MALE">ذكر</option>
              <option value="FEMALE">أنثى</option>
            </select>
          </label>
          <label className="field">
            تاريخ الميلاد
            <input className="input" name="dateOfBirth" type="date" />
          </label>
          <label className="field">
            رقم الهاتف
            <input className="input" name="phone" placeholder="+966501234567" dir="ltr" />
          </label>
          <label className="field full">
            البريد الإلكتروني
            <input className="input" name="email" type="email" placeholder="pilgrim@example.com" dir="ltr" />
          </label>
        </form>
      </Modal>
    </>
  );
}
