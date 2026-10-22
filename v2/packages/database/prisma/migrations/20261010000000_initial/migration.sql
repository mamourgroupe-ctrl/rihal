-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'SUPERVISOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "TripKind" AS ENUM ('HAJJ', 'UMRAH');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'REGISTERED', 'DOCUMENTS_PENDING', 'READY', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('DRAFT', 'READY', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PASSPORT', 'VISA', 'PHOTO', 'VACCINATION', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" VARCHAR(128) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(128) NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" VARCHAR(128) NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "nationality" CHAR(2),
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" VARCHAR(128) NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "name" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "kind" "TripKind" NOT NULL,
    "startsAt" DATE NOT NULL,
    "endsAt" DATE NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" VARCHAR(128) NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "personId" VARCHAR(128) NOT NULL,
    "tripId" VARCHAR(128) NOT NULL,
    "bookingReference" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" VARCHAR(128) NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "tripId" VARCHAR(128) NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "status" "GroupStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" VARCHAR(128) NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "tripId" VARCHAR(128) NOT NULL,
    "groupId" VARCHAR(128) NOT NULL,
    "bookingId" VARCHAR(128) NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" VARCHAR(128) NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "personId" VARCHAR(128) NOT NULL,
    "bookingId" VARCHAR(128),
    "uploadedById" VARCHAR(128),
    "verifiedById" VARCHAR(128),
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "verifiedAt" TIMESTAMPTZ(3),
    "expiresAt" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" VARCHAR(128) NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "bookingId" VARCHAR(128) NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMPTZ(3),
    "paidAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" VARCHAR(128) NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "userId" VARCHAR(128),
    "personId" VARCHAR(128),
    "bookingId" VARCHAR(128),
    "channel" "NotificationChannel" NOT NULL,
    "template" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" VARCHAR(128) NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "actorUserId" VARCHAR(128),
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_id_tenantId_key" ON "users"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE INDEX "people_tenantId_fullName_idx" ON "people"("tenantId", "fullName");

-- CreateIndex
CREATE UNIQUE INDEX "people_id_tenantId_key" ON "people"("id", "tenantId");

-- CreateIndex
CREATE INDEX "trips_tenantId_season_idx" ON "trips"("tenantId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "trips_id_tenantId_key" ON "trips"("id", "tenantId");

-- CreateIndex
CREATE INDEX "bookings_tenantId_tripId_status_idx" ON "bookings"("tenantId", "tripId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_id_tenantId_key" ON "bookings"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_id_tripId_tenantId_key" ON "bookings"("id", "tripId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_id_personId_tenantId_key" ON "bookings"("id", "personId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_tenantId_personId_tripId_key" ON "bookings"("tenantId", "personId", "tripId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_tenantId_bookingReference_key" ON "bookings"("tenantId", "bookingReference");

-- CreateIndex
CREATE INDEX "groups_tenantId_tripId_idx" ON "groups"("tenantId", "tripId");

-- CreateIndex
CREATE UNIQUE INDEX "groups_id_tenantId_key" ON "groups"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "groups_id_tripId_tenantId_key" ON "groups"("id", "tripId", "tenantId");

-- CreateIndex
CREATE INDEX "group_members_tenantId_tripId_idx" ON "group_members"("tenantId", "tripId");

-- CreateIndex
CREATE INDEX "group_members_bookingId_tripId_tenantId_idx" ON "group_members"("bookingId", "tripId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_id_tenantId_key" ON "group_members"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_tenantId_groupId_bookingId_key" ON "group_members"("tenantId", "groupId", "bookingId");

-- CreateIndex
CREATE INDEX "documents_tenantId_personId_idx" ON "documents"("tenantId", "personId");

-- CreateIndex
CREATE INDEX "documents_bookingId_personId_tenantId_idx" ON "documents"("bookingId", "personId", "tenantId");

-- CreateIndex
CREATE INDEX "documents_uploadedById_tenantId_idx" ON "documents"("uploadedById", "tenantId");

-- CreateIndex
CREATE INDEX "documents_verifiedById_tenantId_idx" ON "documents"("verifiedById", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "documents_id_tenantId_key" ON "documents"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "documents_tenantId_storageKey_key" ON "documents"("tenantId", "storageKey");

-- CreateIndex
CREATE INDEX "invoices_tenantId_status_idx" ON "invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "invoices_bookingId_tenantId_idx" ON "invoices"("bookingId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_id_tenantId_key" ON "invoices"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenantId_invoiceNumber_key" ON "invoices"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "notifications_tenantId_status_createdAt_idx" ON "notifications"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_tenantId_idx" ON "notifications"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "notifications_personId_tenantId_idx" ON "notifications"("personId", "tenantId");

-- CreateIndex
CREATE INDEX "notifications_bookingId_tenantId_idx" ON "notifications"("bookingId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_id_tenantId_key" ON "notifications"("id", "tenantId");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_tenantId_idx" ON "audit_logs"("actorUserId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_id_tenantId_key" ON "audit_logs"("id", "tenantId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_personId_tenantId_fkey" FOREIGN KEY ("personId", "tenantId") REFERENCES "people"("id", "tenantId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tripId_tenantId_fkey" FOREIGN KEY ("tripId", "tenantId") REFERENCES "trips"("id", "tenantId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_tripId_tenantId_fkey" FOREIGN KEY ("tripId", "tenantId") REFERENCES "trips"("id", "tenantId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_tripId_tenantId_fkey" FOREIGN KEY ("tripId", "tenantId") REFERENCES "trips"("id", "tenantId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_groupId_tripId_tenantId_fkey" FOREIGN KEY ("groupId", "tripId", "tenantId") REFERENCES "groups"("id", "tripId", "tenantId") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_bookingId_tripId_tenantId_fkey" FOREIGN KEY ("bookingId", "tripId", "tenantId") REFERENCES "bookings"("id", "tripId", "tenantId") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_personId_tenantId_fkey" FOREIGN KEY ("personId", "tenantId") REFERENCES "people"("id", "tenantId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_bookingId_personId_tenantId_fkey" FOREIGN KEY ("bookingId", "personId", "tenantId") REFERENCES "bookings"("id", "personId", "tenantId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_tenantId_fkey" FOREIGN KEY ("uploadedById", "tenantId") REFERENCES "users"("id", "tenantId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_verifiedById_tenantId_fkey" FOREIGN KEY ("verifiedById", "tenantId") REFERENCES "users"("id", "tenantId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_bookingId_tenantId_fkey" FOREIGN KEY ("bookingId", "tenantId") REFERENCES "bookings"("id", "tenantId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_tenantId_fkey" FOREIGN KEY ("userId", "tenantId") REFERENCES "users"("id", "tenantId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_personId_tenantId_fkey" FOREIGN KEY ("personId", "tenantId") REFERENCES "people"("id", "tenantId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_bookingId_tenantId_fkey" FOREIGN KEY ("bookingId", "tenantId") REFERENCES "bookings"("id", "tenantId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_tenantId_fkey" FOREIGN KEY ("actorUserId", "tenantId") REFERENCES "users"("id", "tenantId") ON DELETE RESTRICT ON UPDATE RESTRICT;
