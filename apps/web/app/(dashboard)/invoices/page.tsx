'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Kpi, Loading, Modal, PageHeader, useToast } from '@/components/ui';
import { api, ApiError, download, fetchBlobUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { INVOICE_LABELS, INVOICE_TONE, formatDate, money } from '@/lib/format';
import type {
  Invoice,
  InvoiceListResponse,
  InvoiceStats,
  InvoiceStatus,
  QrField,
} from '@/lib/types';

interface LineDraft {
  description: string;
  quantity: number;
  unitPrice: number;
}

const EMPTY_LINE: LineDraft = { description: '', quantity: 1, unitPrice: 0 };

export default function InvoicesPage() {
  const { canWrite, canManage, canIssue } = useAuth();
  const { notify } = useToast();

  const [list, setList] = useState<InvoiceListResponse | null>(null);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerVat, setBuyerVat] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([{ ...EMPTY_LINE }]);
  const [createError, setCreateError] = useState('');
  const [busy, setBusy] = useState(false);

  const [qrInvoice, setQrInvoice] = useState<Invoice | null>(null);
  const [qrFields, setQrFields] = useState<QrField[]>([]);
  const [qrImage, setQrImage] = useState('');

  function closeQr() {
    setQrInvoice(null);
    setQrImage((current) => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });
  }

  const load = useCallback(async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        api<InvoiceListResponse>(`/invoices?limit=20${status ? `&status=${status}` : ''}`),
        api<InvoiceStats>('/invoices/stats'),
      ]);
      setList(listRes);
      setStats(statsRes);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل الفواتير');
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const subtotal =
      Math.round(
        lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unitPrice * 100) / 100, 0) * 100,
      ) / 100;
    const vat = Math.round(subtotal * 0.15 * 100) / 100;
    return { subtotal, vat, total: Math.round((subtotal + vat) * 100) / 100 };
  }, [lines]);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const items = lines
      .filter((line) => line.description.trim())
      .map((line) => ({
        description: line.description.trim(),
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      }));
    if (items.length === 0) {
      setCreateError('أضف بنداً واحداً على الأقل');
      return;
    }
    if (items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      setCreateError('كمية كل بند يجب أن تكون أكبر من صفر');
      return;
    }
    if (items.some((item) => !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
      setCreateError('سعر الوحدة غير صالح');
      return;
    }

    setBusy(true);
    setCreateError('');
    try {
      await api<Invoice>('/invoices', {
        method: 'POST',
        body: {
          buyerName: buyerName.trim(),
          ...(buyerVat.trim() ? { buyerVatNumber: buyerVat.trim() } : {}),
          items,
        },
      });
      setCreateOpen(false);
      setBuyerName('');
      setBuyerVat('');
      setLines([{ ...EMPTY_LINE }]);
      notify('حُفظت الفاتورة كمسودة — أصدرها لتوليد رمز ZATCA');
      await load();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'تعذّر الإنشاء');
    } finally {
      setBusy(false);
    }
  }

  async function act(invoice: Invoice, action: 'issue' | 'pay' | 'cancel') {
    if (action === 'cancel' && !window.confirm('إلغاء هذه الفاتورة؟')) return;
    try {
      const result = await api<{ invoice?: Invoice } | Invoice>(`/invoices/${invoice.id}/${action}`, {
        method: 'POST',
      });
      const updated = (result as { invoice?: Invoice }).invoice ?? (result as Invoice);
      notify(
        action === 'issue'
          ? `صدرت الفاتورة ${updated.invoiceNumber ?? ''}`
          : action === 'pay'
            ? 'تم تسجيل الدفع'
            : 'أُلغيت الفاتورة',
      );
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تعذّر تنفيذ الإجراء', true);
    }
  }

  async function showQr(invoice: Invoice) {
    try {
      const [result, imageUrl] = await Promise.all([
        api<{ base64: string; fields: QrField[] }>(`/invoices/${invoice.id}/qr`),
        fetchBlobUrl(`/invoices/${invoice.id}/qr.svg`),
      ]);
      setQrFields(result.fields);
      setQrImage((current) => {
        if (current) URL.revokeObjectURL(current);
        return imageUrl;
      });
      setQrInvoice(invoice);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تعذّر توليد الرمز', true);
    }
  }

  function canCancel(invoice: Invoice) {
    return canManage && !['PAID', 'CANCELLED'].includes(invoice.status);
  }

  const QR_LABELS: Record<number, string> = {
    1: 'اسم البائع',
    2: 'الرقم الضريبي',
    3: 'الطابع الزمني',
    4: 'الإجمالي شامل الضريبة',
    5: 'مبلغ الضريبة',
  };

  return (
    <>
      <PageHeader
        title="الفوترة"
        subtitle="فواتير ضريبية مبسطة مع رمز ZATCA وسلسلة تجزئة"
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              className="select"
              style={{ width: 160 }}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">كل الحالات</option>
              {(Object.keys(INVOICE_LABELS) as InvoiceStatus[]).map((option) => (
                <option key={option} value={option}>
                  {INVOICE_LABELS[option]}
                </option>
              ))}
            </select>
            {canWrite ? (
              <button type="button" className="btn" onClick={() => setCreateOpen(true)}>
                + فاتورة جديدة
              </button>
            ) : null}
          </div>
        }
      />

      {error ? <div className="form-error" style={{ marginBottom: 14 }}>{error}</div> : null}

      <section className="grid kpis">
        <Kpi label="مبالغ محصّلة" value={money(stats?.paidAmount ?? 0)} tone="accent" hint="فواتير مدفوعة" />
        <Kpi label="مستحقة غير مدفوعة" value={money(stats?.issuedAmount ?? 0)} tone="gold" hint="فواتير صادرة" />
        <Kpi label="ضريبة القيمة المضافة" value={money(stats?.vatCollected ?? 0)} hint="إجمالي الضريبة" />
        <Kpi
          label="عدد الفواتير"
          value={stats?.total ?? 0}
          hint={
            stats
              ? `${stats.byStatus.DRAFT} مسودة · ${stats.byStatus.ISSUED} صادرة · ${stats.byStatus.PAID} مدفوعة`
              : undefined
          }
        />
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        {!list ? (
          <Loading />
        ) : list.items.length === 0 ? (
          <div className="empty">لا توجد فواتير بعد — أنشئ أول فاتورة</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>الرقم / المشتري</th>
                  <th className="hide-sm">التاريخ</th>
                  <th>قبل الضريبة</th>
                  <th>الضريبة</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <div className="mono">{invoice.invoiceNumber ?? '— مسودة —'}</div>
                      <div className="cell-sub">{invoice.buyerName}</div>
                    </td>
                    <td className="hide-sm">{formatDate(invoice.issuedAt ?? invoice.createdAt)}</td>
                    <td><span className="money">{money(invoice.subtotal)}</span></td>
                    <td><span className="money">{money(invoice.vatAmount)}</span></td>
                    <td><span className="money" style={{ fontWeight: 600 }}>{money(invoice.total)}</span></td>
                    <td><Badge tone={INVOICE_TONE[invoice.status]}>{INVOICE_LABELS[invoice.status]}</Badge></td>
                    <td>
                      <div className="row-actions">
                        {invoice.status === 'DRAFT' && canIssue ? (
                          <button type="button" className="btn ghost small" onClick={() => act(invoice, 'issue')}>
                            إصدار
                          </button>
                        ) : null}
                        {['ISSUED', 'OVERDUE'].includes(invoice.status) && canIssue ? (
                          <button type="button" className="btn ghost small" onClick={() => act(invoice, 'pay')}>
                            تسجيل الدفع
                          </button>
                        ) : null}
                        {invoice.zatcaQr ? (
                          <>
                            <button type="button" className="btn ghost small" onClick={() => showQr(invoice)}>
                              QR
                            </button>
                            <button
                              type="button"
                              className="btn ghost small"
                              onClick={() =>
                                download(`/invoices/${invoice.id}/xml`, `${invoice.invoiceNumber}.xml`).catch(
                                  (err) => notify(err instanceof Error ? err.message : 'تعذّر التنزيل', true),
                                )
                              }
                            >
                              XML
                            </button>
                          </>
                        ) : null}
                        {canCancel(invoice) ? (
                          <button type="button" className="btn danger small" onClick={() => act(invoice, 'cancel')}>
                            إلغاء
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={createOpen}
        title="فاتورة جديدة"
        subtitle="تُحفظ كمسودة — الإصدار يولّد الرقم ورمز ZATCA"
        onClose={() => setCreateOpen(false)}
        wide
        footer={
          <>
            <button type="button" className="btn ghost" onClick={() => setCreateOpen(false)}>
              إلغاء
            </button>
            <button type="submit" form="create-invoice" className="btn" disabled={busy}>
              {busy ? 'جارٍ الحفظ…' : 'حفظ كمسودة'}
            </button>
          </>
        }
      >
        {createError ? <div className="form-error">{createError}</div> : null}
        <form id="create-invoice" className="grid" style={{ gap: 14 }} onSubmit={handleCreate}>
          <div className="form-grid">
            <label className="field">
              اسم المشتري *
              <input
                className="input"
                required
                minLength={2}
                value={buyerName}
                onChange={(event) => setBuyerName(event.target.value)}
                placeholder="شركة النور للسياحة"
              />
            </label>
            <label className="field">
              الرقم الضريبي للمشتري (اختياري)
              <input
                className="input"
                pattern="\d{15}"
                dir="ltr"
                value={buyerVat}
                onChange={(event) => setBuyerVat(event.target.value)}
                placeholder="300000000000003"
              />
            </label>
          </div>

          <div className="grid" style={{ gap: 8 }}>
            <div className="text-xs muted">بنود الفاتورة</div>
            {lines.map((line, index) => (
              <div
                key={index}
                style={{ display: 'grid', gridTemplateColumns: '1fr 78px 100px 32px', gap: 6, alignItems: 'center' }}
              >
                <input
                  className="input"
                  placeholder="وصف البند"
                  value={line.description}
                  onChange={(event) => updateLine(index, { description: event.target.value })}
                />
                <input
                  className="input"
                  type="number"
                  min={0.01}
                  step={0.01}
                  dir="ltr"
                  value={line.quantity}
                  onChange={(event) =>
                    updateLine(index, {
                      quantity: Number.isFinite(event.target.valueAsNumber)
                        ? event.target.valueAsNumber
                        : 0,
                    })
                  }
                />
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={0.01}
                  dir="ltr"
                  value={line.unitPrice}
                  onChange={(event) =>
                    updateLine(index, {
                      unitPrice: Number.isFinite(event.target.valueAsNumber)
                        ? event.target.valueAsNumber
                        : 0,
                    })
                  }
                />
                <button
                  type="button"
                  className="btn danger small"
                  onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                  disabled={lines.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn ghost small"
              style={{ justifySelf: 'flex-start' }}
              onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}
            >
              + إضافة بند
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 5,
              background: 'rgba(0,0,0,0.22)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '11px 13px',
              fontSize: 12.5,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">الإجمالي قبل الضريبة</span>
              <span className="money">{money(totals.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">ضريبة القيمة المضافة 15%</span>
              <span className="money">{money(totals.vat)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px dashed var(--border)',
                paddingTop: 6,
                color: 'var(--green)',
                fontWeight: 700,
              }}
            >
              <span>الإجمالي المستحق</span>
              <span className="money">{money(totals.total)}</span>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={qrInvoice !== null}
        title="رمز ZATCA"
        subtitle={qrInvoice?.invoiceNumber ?? ''}
        onClose={closeQr}
        footer={
          qrInvoice ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() =>
                download(`/invoices/${qrInvoice.id}/xml`, `${qrInvoice.invoiceNumber}.xml`).catch((err) =>
                  notify(err instanceof Error ? err.message : 'تعذّر التنزيل', true),
                )
              }
            >
              تنزيل XML
            </button>
          ) : null
        }
      >
        {qrInvoice ? (
          <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 16, alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qrImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrImage}
                alt="ZATCA QR"
                width={170}
                height={170}
                style={{ background: '#fff', borderRadius: 12, padding: 8 }}
              />
            ) : (
              <div style={{ width: 170, height: 170, background: '#fff', borderRadius: 12 }} />
            )}
            <div className="grid" style={{ gap: 5, fontSize: 11.5 }}>
              {qrFields.map((field) => (
                <div key={field.tag}>
                  {QR_LABELS[field.tag] ?? `Tag ${field.tag}`}
                  <code
                    style={{
                      display: 'block',
                      direction: 'ltr',
                      textAlign: 'left',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: 7,
                      padding: '4px 7px',
                      fontSize: 10.5,
                      color: '#9fe8d2',
                      wordBreak: 'break-all',
                    }}
                  >
                    {field.value}
                  </code>
                </div>
              ))}
              {qrInvoice.zatcaHash ? (
                <div>
                  Hash
                  <code
                    style={{
                      display: 'block',
                      direction: 'ltr',
                      textAlign: 'left',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: 7,
                      padding: '4px 7px',
                      fontSize: 10.5,
                      color: '#9fe8d2',
                      wordBreak: 'break-all',
                    }}
                  >
                    {qrInvoice.zatcaHash}
                  </code>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
