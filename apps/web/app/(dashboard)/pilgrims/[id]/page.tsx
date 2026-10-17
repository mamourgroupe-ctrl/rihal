'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Loading, PageHeader, useToast } from '@/components/ui';
import { api, ApiError, download, upload } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  DOCUMENT_LABELS,
  PILGRIM_LABELS,
  PILGRIM_TONE,
  formatBytes,
  formatDate,
} from '@/lib/format';
import type {
  DocumentType,
  Pilgrim,
  PilgrimDocumentsView,
  PilgrimStatus,
} from '@/lib/types';

const DOCUMENT_TYPES = Object.keys(DOCUMENT_LABELS) as DocumentType[];
const STATUS_OPTIONS = Object.keys(PILGRIM_LABELS) as PilgrimStatus[];

export default function PilgrimDetailPage() {
  const params = useParams<{ id: string }>();
  const pilgrimId = params.id;
  const { canWrite, canVerify } = useAuth();
  const { notify } = useToast();

  const [pilgrim, setPilgrim] = useState<Pilgrim | null>(null);
  const [documents, setDocuments] = useState<PilgrimDocumentsView | null>(null);
  const [error, setError] = useState('');
  const [docType, setDocType] = useState<DocumentType>('PASSPORT');
  const [file, setFile] = useState<File | null>(null);
  const [mrz, setMrz] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pilgrimRes, docsRes] = await Promise.all([
        api<Pilgrim>(`/pilgrims/${pilgrimId}`),
        api<PilgrimDocumentsView>(`/pilgrims/${pilgrimId}/documents`),
      ]);
      setPilgrim(pilgrimRes);
      setDocuments(docsRes);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل الملف');
    }
  }, [pilgrimId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      notify('اختر ملفاً أولاً', true);
      return;
    }
    const form = new FormData();
    form.append('type', docType);
    form.append('file', file);
    if (docType === 'PASSPORT' && mrz.trim()) form.append('ocrText', mrz);

    setBusy(true);
    try {
      const result = await upload<{ document: { verified: boolean; ocrData?: { source: string; mismatches: string[] } } }>(
        `/pilgrims/${pilgrimId}/documents`,
        form,
      );
      const verifiedOk = result.document.verified;
      notify(
        docType === 'PASSPORT'
          ? verifiedOk
            ? 'تم التحقق من الجواز ومطابقته للسجل'
            : 'رُفعت الوثيقة — غير موثّقة، راجع التحذيرات'
          : 'تم رفع الوثيقة',
        docType === 'PASSPORT' && !verifiedOk,
      );
      setFile(null);
      setMrz('');
      const input = document.getElementById('doc-file') as HTMLInputElement | null;
      if (input) input.value = '';
      await load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'فشل الرفع', true);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(documentId: string, verified: boolean) {
    try {
      await api(`/documents/${documentId}/verify`, {
        method: 'PATCH',
        body: { verified },
      });
      notify(verified ? 'تم توثيق الوثيقة' : 'أُلغي التوثيق');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تعذّر التحديث', true);
    }
  }

  async function handleRemove(documentId: string) {
    if (!window.confirm('حذف هذه الوثيقة نهائياً؟')) return;
    try {
      await api(`/documents/${documentId}`, { method: 'DELETE' });
      notify('تم حذف الوثيقة');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تعذّر الحذف', true);
    }
  }

  async function handleStatusChange(status: PilgrimStatus) {
    try {
      await api(`/pilgrims/${pilgrimId}`, { method: 'PATCH', body: { status } });
      notify('تم تحديث الحالة');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تعذّر التحديث', true);
    }
  }

  if (error) {
    return (
      <>
        <PageHeader title="ملف المعتمر" />
        <div className="form-error">{error}</div>
        <Link href="/pilgrims" className="btn ghost" style={{ marginTop: 14 }}>
          العودة للقائمة
        </Link>
      </>
    );
  }

  if (!pilgrim || !documents) return <Loading label="جارٍ تحميل ملف المعتمر…" />;

  return (
    <>
      <PageHeader
        title={pilgrim.fullNameAr}
        subtitle={`${pilgrim.fullNameEn} · جواز ${pilgrim.passportNumber} · ${pilgrim.nationality}`}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge tone={PILGRIM_TONE[pilgrim.status]}>{PILGRIM_LABELS[pilgrim.status]}</Badge>
            {canWrite ? (
              <select
                className="select"
                style={{ width: 175 }}
                value={pilgrim.status}
                onChange={(event) => handleStatusChange(event.target.value as PilgrimStatus)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {PILGRIM_LABELS[option]}
                  </option>
                ))}
              </select>
            ) : null}
            <Link href="/pilgrims" className="btn ghost small">
              رجوع
            </Link>
          </div>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        <section className="panel">
          <div className="panel-head">
            <h2 className="h2">قائمة التحقق من الوثائق</h2>
            <span style={{ marginInlineStart: 'auto' }}>
              {documents.readiness.readyForBooking ? (
                <Badge tone="green">جاهز للحجز</Badge>
              ) : documents.readiness.complete ? (
                <Badge tone="gold">مكتملة — بانتظار التوثيق</Badge>
              ) : (
                <Badge tone="red">
                  ناقص: {documents.readiness.missing.map((type) => DOCUMENT_LABELS[type]).join(' + ')}
                </Badge>
              )}
            </span>
          </div>
          <div className="panel-body">
            <div className="checklist">
              {documents.readiness.checklist.map((item) => (
                <div
                  key={item.type}
                  className={`check-item ${item.uploaded ? 'ok' : item.required ? 'missing' : ''}`}
                >
                  <div className="check-name">
                    <span>{DOCUMENT_LABELS[item.type]}</span>
                    {item.required ? <span style={{ color: 'var(--gold)', fontSize: 9 }}>● مطلوبة</span> : null}
                  </div>
                  <div className="check-note">
                    {item.uploaded ? (item.verified ? 'موثّقة ✓' : 'بانتظار التوثيق') : 'غير مرفوعة'}
                  </div>
                  {item.expiresAt ? (
                    <div className="check-note" style={{ color: item.expired ? 'var(--danger)' : undefined }}>
                      تنتهي: {formatDate(item.expiresAt)}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="h2">بيانات المعتمر</h2>
          </div>
          <div className="panel-body grid" style={{ gap: 8, fontSize: 13 }}>
            <Row label="رقم الجواز" value={<span className="mono">{pilgrim.passportNumber}</span>} />
            <Row label="انتهاء الجواز" value={formatDate(pilgrim.passportExpiry)} />
            <Row label="الجنسية" value={pilgrim.nationality} />
            <Row label="تاريخ الميلاد" value={formatDate(pilgrim.dateOfBirth)} />
            <Row label="الجنس" value={pilgrim.gender === 'MALE' ? 'ذكر' : pilgrim.gender === 'FEMALE' ? 'أنثى' : '—'} />
            <Row label="الهاتف" value={<span className="mono">{pilgrim.phone ?? '—'}</span>} />
            <Row label="البريد" value={pilgrim.email ?? '—'} />
            <Row label="أُضيف" value={formatDate(pilgrim.createdAt)} />
          </div>
        </section>
      </div>

      {canWrite ? (
        <section className="panel" style={{ marginTop: 14 }}>
          <div className="panel-head">
            <h2 className="h2">رفع وثيقة</h2>
            <span className="text-xs muted" style={{ marginInlineStart: 'auto' }}>
              JPG / PNG / WEBP / PDF · حتى 5 ميجابايت
            </span>
          </div>
          <form className="panel-body form-grid" onSubmit={handleUpload}>
            <label className="field">
              نوع الوثيقة
              <select
                className="select"
                value={docType}
                onChange={(event) => setDocType(event.target.value as DocumentType)}
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DOCUMENT_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              الملف
              <input
                id="doc-file"
                className="input"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {docType === 'PASSPORT' ? (
              <label className="field full">
                الرمز الآلي MRZ (سطران من أسفل صفحة الجواز) — اختياري لكنه يفعّل التحقق الآلي
                <textarea
                  className="textarea"
                  rows={3}
                  dir="ltr"
                  style={{ fontFamily: 'var(--mono)', fontSize: 11.5, textAlign: 'left' }}
                  placeholder={'P<SAUALOTAIBI<<ABDULLAH<MOHAMMED<<<<<<<<<<<<\nA123456784SAU9002155M31082061234567890123454'}
                  value={mrz}
                  onChange={(event) => setMrz(event.target.value)}
                />
              </label>
            ) : null}
            <div className="full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn" disabled={busy}>
                {busy ? 'جارٍ الرفع…' : 'رفع الوثيقة'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-head">
          <h2 className="h2">الملفات المرفوعة</h2>
          <span className="text-xs muted" style={{ marginInlineStart: 'auto' }}>
            {documents.items.length} ملف
          </span>
        </div>
        <div className="panel-body grid" style={{ gap: 8 }}>
          {documents.items.length === 0 ? (
            <div className="text-sm muted">لا توجد ملفات بعد</div>
          ) : (
            documents.items.map((document) => (
              <div className="doc-item" key={document.id}>
                <div className="meta">
                  <b>
                    {DOCUMENT_LABELS[document.type]} — {document.fileName}
                  </b>
                  <span>
                    {formatBytes(document.fileSize)} · {formatDate(document.createdAt)} ·{' '}
                    {document.verified ? (
                      <span style={{ color: 'var(--green)' }}>موثّقة</span>
                    ) : (
                      <span style={{ color: 'var(--gold)' }}>غير موثّقة</span>
                    )}
                  </span>
                  {document.ocrData?.mismatches?.length ? (
                    <span className="warn-line">{document.ocrData.mismatches.join(' · ')}</span>
                  ) : null}
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() =>
                      download(`/documents/${document.id}/download`, document.fileName).catch((err) =>
                        notify(err instanceof Error ? err.message : 'تعذّر التنزيل', true),
                      )
                    }
                  >
                    تنزيل
                  </button>
                  {canVerify ? (
                    <>
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() => handleVerify(document.id, !document.verified)}
                      >
                        {document.verified ? 'إلغاء التوثيق' : 'تحقق'}
                      </button>
                      <button
                        type="button"
                        className="btn danger small"
                        onClick={() => handleRemove(document.id)}
                      >
                        حذف
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span className="muted">{label}</span>
      <span style={{ textAlign: 'left' }}>{value}</span>
    </div>
  );
}
