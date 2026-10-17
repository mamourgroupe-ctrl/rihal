import type { DocumentType, GroupStatus, InvoiceStatus, PilgrimStatus, Role } from './types';

export const PILGRIM_LABELS: Record<PilgrimStatus, string> = {
  DRAFT: 'مسودة',
  REGISTERED: 'مسجّل',
  DOCUMENTS_UPLOADED: 'الوثائق مرفوعة',
  READY_FOR_BOOKING: 'جاهز للحجز',
  BOOKED: 'محجوز',
  PERMIT_ISSUED: 'التصريح صادر',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغى',
};

export const PILGRIM_TONE: Record<PilgrimStatus, string> = {
  DRAFT: 'gray',
  REGISTERED: 'blue',
  DOCUMENTS_UPLOADED: 'blue',
  READY_FOR_BOOKING: 'green',
  BOOKED: 'green',
  PERMIT_ISSUED: 'gold',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

export const PILGRIM_COLORS: Record<PilgrimStatus, string> = {
  DRAFT: '#5c6f68',
  REGISTERED: '#60a5fa',
  DOCUMENTS_UPLOADED: '#818cf8',
  READY_FOR_BOOKING: '#2dd4a7',
  BOOKED: '#10b981',
  PERMIT_ISSUED: '#d9b36c',
  COMPLETED: '#34d399',
  CANCELLED: '#f87171',
};

export const GROUP_LABELS: Record<GroupStatus, string> = {
  DRAFT: 'مسودة',
  READY: 'جاهزة',
  SUBMITTED: 'مُرسلة',
  CONFIRMED: 'مؤكدة',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغاة',
};

export const GROUP_TONE: Record<GroupStatus, string> = {
  DRAFT: 'gray',
  READY: 'green',
  SUBMITTED: 'blue',
  CONFIRMED: 'gold',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

export const INVOICE_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'مسودة',
  ISSUED: 'صادرة',
  PAID: 'مدفوعة',
  OVERDUE: 'متأخرة',
  CANCELLED: 'ملغاة',
};

export const INVOICE_TONE: Record<InvoiceStatus, string> = {
  DRAFT: 'gray',
  ISSUED: 'blue',
  PAID: 'green',
  OVERDUE: 'red',
  CANCELLED: 'red',
};

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  PASSPORT: 'جواز السفر',
  PHOTO: 'صورة شخصية',
  VISA: 'تأشيرة',
  VACCINATION: 'شهادة تطعيم',
  INSURANCE: 'تأمين',
  OTHER: 'أخرى',
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'مدير الوكالة',
  OPERATOR: 'منسّق العمليات',
  SUPERVISOR: 'مشرف المجموعات',
  VIEWER: 'مطّلع',
};

export function money(value: number | string | null | undefined): string {
  return Number(value ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ar-SA-u-ca-gregory', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0] ?? '').join('');
}
