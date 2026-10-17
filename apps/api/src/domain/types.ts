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
