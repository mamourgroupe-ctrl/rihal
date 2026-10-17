export type Role = 'ADMIN' | 'OPERATOR' | 'SUPERVISOR' | 'VIEWER';

export type PilgrimStatus =
  | 'DRAFT'
  | 'REGISTERED'
  | 'DOCUMENTS_UPLOADED'
  | 'READY_FOR_BOOKING'
  | 'BOOKED'
  | 'PERMIT_ISSUED'
  | 'COMPLETED'
  | 'CANCELLED';

export type GroupStatus = 'DRAFT' | 'READY' | 'SUBMITTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type DocumentType = 'PASSPORT' | 'VISA' | 'PHOTO' | 'VACCINATION' | 'INSURANCE' | 'OTHER';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  vatNumber?: string | null;
  crNumber?: string | null;
  addressLine?: string | null;
  city?: string | null;
  country: string;
}

export interface AuthSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: User;
  tenant: Tenant;
}

export interface Pilgrim {
  id: string;
  tenantId: string;
  fullNameAr: string;
  fullNameEn: string;
  passportNumber: string;
  passportExpiry: string;
  nationality: string;
  dateOfBirth?: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  phone?: string | null;
  email?: string | null;
  status: PilgrimStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface GroupMember {
  id: string;
  groupId: string;
  pilgrimId: string;
  isLeader: boolean;
  pilgrim?: Pick<Pilgrim, 'id' | 'fullNameAr' | 'fullNameEn' | 'passportNumber' | 'status'>;
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

export interface PassportOcrResult {
  source: 'mrz' | 'none';
  passportNumber?: string;
  fullNameEn?: string;
  nationality?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE';
  passportExpiry?: string;
  issuingState?: string;
  checkDigitsValid?: boolean;
  mismatches: string[];
}

export interface PilgrimDocument {
  id: string;
  tenantId: string;
  pilgrimId: string;
  type: DocumentType;
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

export interface PilgrimDocumentsView {
  items: PilgrimDocument[];
  readiness: DocumentReadiness;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
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
  zatcaQr?: string | null;
  zatcaHash?: string | null;
  previousHash?: string | null;
  notes?: string | null;
  issuedAt?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListResponse extends Paginated<Invoice> {
  summary: { issued: number; paid: number; vat: number };
}

export interface InvoiceStats {
  total: number;
  byStatus: Record<InvoiceStatus, number>;
  issuedAmount: number;
  paidAmount: number;
  vatCollected: number;
}

export interface QrField {
  tag: number;
  value: string;
}
