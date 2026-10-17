/**
 * Domain types shared by every data provider (Prisma or in-memory demo).
 * They mirror the Prisma schema in packages/database/prisma/schema.prisma.
 */

export const PILGRIM_STATUSES = [
  'DRAFT',
  'REGISTERED',
  'DOCUMENTS_UPLOADED',
  'READY_FOR_BOOKING',
  'BOOKED',
  'PERMIT_ISSUED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type PilgrimStatus = (typeof PILGRIM_STATUSES)[number];

export const GENDERS = ['MALE', 'FEMALE'] as const;
export type Gender = (typeof GENDERS)[number];

export const GROUP_STATUSES = [
  'DRAFT',
  'READY',
  'SUBMITTED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type GroupStatus = (typeof GROUP_STATUSES)[number];

export interface Pilgrim {
  id: string;
  tenantId: string;
  fullNameAr: string;
  fullNameEn: string;
  passportNumber: string;
  passportExpiry: string; // ISO date
  nationality: string;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  phone?: string | null;
  email?: string | null;
  status: PilgrimStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  pilgrimId: string;
  isLeader: boolean;
  pilgrim?: Pick<
    Pilgrim,
    'id' | 'fullNameAr' | 'fullNameEn' | 'passportNumber' | 'status'
  >;
}

export interface Group {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  maxSize: number;
  status: GroupStatus;
  scheduledDate?: string | null;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
}

export interface PilgrimListQuery {
  search?: string;
  status?: PilgrimStatus;
  page: number;
  limit: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface DashboardStats {
  pilgrims: {
    total: number;
    byStatus: Record<PilgrimStatus, number>;
    readyForBooking: number;
    documentsPending: number;
  };
  groups: {
    total: number;
    byStatus: Record<GroupStatus, number>;
    openSlots: number;
  };
  passportsExpiringSoon: number;
}

export interface CreatePilgrimInput {
  fullNameAr: string;
  fullNameEn: string;
  passportNumber: string;
  passportExpiry: string;
  nationality: string;
  dateOfBirth?: string;
  gender?: Gender;
  phone?: string;
  email?: string;
  status?: PilgrimStatus;
  notes?: string;
}

export interface UpdatePilgrimInput extends Partial<CreatePilgrimInput> {}

export interface CreateGroupInput {
  name: string;
  description?: string;
  maxSize?: number;
  status?: GroupStatus;
  scheduledDate?: string;
}

export interface UpdateGroupInput extends Partial<CreateGroupInput> {}

// ============================================================
// TENANTS & AUTH
// ============================================================

export const ROLES = ['ADMIN', 'OPERATOR', 'SUPERVISOR', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

export const PLANS = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'] as const;
export type Plan = (typeof PLANS)[number];

export const TENANT_STATUSES = ['ACTIVE', 'SUSPENDED', 'CANCELLED'] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  status: TenantStatus;
  /** ZATCA seller identity. */
  vatNumber?: string | null;
  crNumber?: string | null;
  addressLine?: string | null;
  city?: string | null;
  country: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  phone?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export interface RegisterInput {
  agencyName: string;
  slug: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
}

// ============================================================
// DOCUMENTS
// ============================================================

export const DOCUMENT_TYPES = [
  'PASSPORT',
  'VISA',
  'PHOTO',
  'VACCINATION',
  'INSURANCE',
  'OTHER',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Documents the agency must collect before a pilgrim can be booked. */
export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = ['PASSPORT', 'PHOTO'];

/** Fields we try to read from a passport (MRZ). */
export interface PassportOcrResult {
  source: 'mrz' | 'none';
  passportNumber?: string;
  fullNameEn?: string;
  nationality?: string;
  dateOfBirth?: string;
  gender?: Gender;
  passportExpiry?: string;
  issuingState?: string;
  checkDigitsValid?: boolean;
  /** Differences between the OCR result and the stored pilgrim record. */
  mismatches: string[];
}

export interface PilgrimDocument {
  id: string;
  tenantId: string;
  pilgrimId: string;
  type: DocumentType;
  /** Opaque storage key (never exposed as a public URL). */
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  ocrData?: PassportOcrResult | null;
  verified: boolean;
  createdAt: string;
}

export interface DocumentChecklistItem {
  type: DocumentType;
  required: boolean;
  uploaded: boolean;
  verified: boolean;
  documentId?: string;
  fileName?: string;
  createdAt?: string;
  /** Passport expiry parsed from the MRZ, when available. */
  expiresAt?: string | null;
  expired?: boolean;
}

export interface DocumentReadiness {
  required: DocumentType[];
  missing: DocumentType[];
  complete: boolean;
  readyForBooking: boolean;
  checklist: DocumentChecklistItem[];
}

export interface CreateDocumentInput {
  type: DocumentType;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  ocrData?: PassportOcrResult | null;
  verified?: boolean;
}

export interface PilgrimDocumentsView {
  items: PilgrimDocument[];
  readiness: DocumentReadiness;
}

// ============================================================
// INVOICING (ZATCA e-invoicing)
// ============================================================

export const INVOICE_STATUSES = [
  'DRAFT',
  'ISSUED',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  /** Unit price excluding VAT. */
  unitPrice: number;
  /** quantity × unitPrice, rounded to 2 decimals. */
  lineTotal: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber?: string | null;
  uuid?: string | null;
  buyerName: string;
  buyerVatNumber?: string | null;
  pilgrimId?: string | null;
  items: InvoiceItem[];
  currency: string;
  vatRate: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  status: InvoiceStatus;
  /** Base64 TLV payload mandated by ZATCA (tags 1-5). */
  zatcaQr?: string | null;
  /** SHA-256 of the invoice document, chained to the previous invoice. */
  zatcaHash?: string | null;
  previousHash?: string | null;
  notes?: string | null;
  issuedAt?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceInput {
  buyerName: string;
  buyerVatNumber?: string;
  pilgrimId?: string;
  items: CreateInvoiceItemInput[];
  currency?: string;
  vatRate?: number;
  dueDate?: string;
  notes?: string;
}

export interface InvoiceListQuery {
  status?: InvoiceStatus;
  page: number;
  limit: number;
}

export interface ZatcaQrPayload {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  totalWithVat: string;
  vatTotal: string;
}
