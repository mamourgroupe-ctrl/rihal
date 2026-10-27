-- Create enums
CREATE TYPE "Plan" AS ENUM ('FREE', 'BASIC', 'PRO', 'ENTERPRISE');
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR', 'SUPERVISOR', 'VIEWER');
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');
CREATE TYPE "PilgrimStatus" AS ENUM ('DRAFT', 'REGISTERED', 'DOCUMENTS_UPLOADED', 'READY_FOR_BOOKING', 'BOOKED', 'PERMIT_ISSUED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "GroupStatus" AS ENUM ('DRAFT', 'READY', 'SUBMITTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "DocumentType" AS ENUM ('PASSPORT', 'VISA', 'PHOTO', 'VACCINATION', 'INSURANCE', 'OTHER');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS', 'IN_APP');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- Create tenants
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE INDEX "tenants_archivedAt_idx" ON "tenants"("archivedAt");

-- Create tenant-scoped users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");
CREATE UNIQUE INDEX "users_tenantId_id_key" ON "users"("tenantId", "id");
CREATE INDEX "users_tenantId_archivedAt_idx" ON "users"("tenantId", "archivedAt");

-- Create pilgrims
CREATE TABLE "pilgrims" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fullNameAr" TEXT NOT NULL,
    "fullNameEn" TEXT NOT NULL,
    "passportNumber" TEXT NOT NULL,
    "passportExpiry" TIMESTAMP(3) NOT NULL,
    "nationality" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "phone" TEXT,
    "email" TEXT,
    "status" "PilgrimStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "pilgrims_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pilgrims_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "pilgrims_tenantId_passportNumber_key" ON "pilgrims"("tenantId", "passportNumber");
CREATE UNIQUE INDEX "pilgrims_tenantId_id_key" ON "pilgrims"("tenantId", "id");
CREATE INDEX "pilgrims_tenantId_archivedAt_idx" ON "pilgrims"("tenantId", "archivedAt");
CREATE INDEX "pilgrims_tenantId_status_idx" ON "pilgrims"("tenantId", "status");

-- Create groups
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxSize" INTEGER NOT NULL DEFAULT 4,
    "status" "GroupStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "groups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "groups_maxSize_positive" CHECK ("maxSize" > 0),
    CONSTRAINT "groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "groups_tenantId_id_key" ON "groups"("tenantId", "id");
CREATE INDEX "groups_tenantId_archivedAt_idx" ON "groups"("tenantId", "archivedAt");

-- Create group membership with composite tenant-safe references
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "pilgrimId" TEXT NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "group_members_tenantId_groupId_fkey" FOREIGN KEY ("tenantId", "groupId") REFERENCES "groups"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "group_members_tenantId_pilgrimId_fkey" FOREIGN KEY ("tenantId", "pilgrimId") REFERENCES "pilgrims"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "group_members_tenantId_groupId_archivedAt_idx" ON "group_members"("tenantId", "groupId", "archivedAt");
CREATE INDEX "group_members_tenantId_pilgrimId_archivedAt_idx" ON "group_members"("tenantId", "pilgrimId", "archivedAt");
CREATE UNIQUE INDEX "group_members_active_membership_key" ON "group_members"("tenantId", "groupId", "pilgrimId") WHERE "archivedAt" IS NULL;
CREATE UNIQUE INDEX "group_members_one_active_leader_per_group" ON "group_members"("tenantId", "groupId") WHERE "isLeader" = true AND "archivedAt" IS NULL;

-- Create documents; storageKey is a private object key, not a public URL
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pilgrimId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "ocrData" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "documents_fileSize_positive" CHECK ("fileSize" > 0),
    CONSTRAINT "documents_tenantId_pilgrimId_fkey" FOREIGN KEY ("tenantId", "pilgrimId") REFERENCES "pilgrims"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "documents_tenantId_archivedAt_idx" ON "documents"("tenantId", "archivedAt");
CREATE INDEX "documents_tenantId_pilgrimId_idx" ON "documents"("tenantId", "pilgrimId");

-- Create invoices and their line items
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerName" TEXT,
    "pilgrimId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "zatcaQr" TEXT,
    "zatcaHash" TEXT,
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoices_amount_nonnegative" CHECK ("amount" >= 0),
    CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoices_tenantId_pilgrimId_fkey" FOREIGN KEY ("tenantId", "pilgrimId") REFERENCES "pilgrims"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "invoices_tenantId_invoiceNumber_key" ON "invoices"("tenantId", "invoiceNumber");
CREATE UNIQUE INDEX "invoices_tenantId_id_key" ON "invoices"("tenantId", "id");
CREATE INDEX "invoices_tenantId_archivedAt_idx" ON "invoices"("tenantId", "archivedAt");

CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoice_items_positive_values" CHECK ("quantity" > 0 AND "unitPrice" >= 0 AND "lineTotal" >= 0),
    CONSTRAINT "invoice_items_tenantId_invoiceId_fkey" FOREIGN KEY ("tenantId", "invoiceId") REFERENCES "invoices"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "invoice_items_tenantId_invoiceId_archivedAt_idx" ON "invoice_items"("tenantId", "invoiceId", "archivedAt");

-- Create notifications with tenant-safe optional user and pilgrim references
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "pilgrimId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "template" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "notifications_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "users"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "notifications_tenantId_pilgrimId_fkey" FOREIGN KEY ("tenantId", "pilgrimId") REFERENCES "pilgrims"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "notifications_tenantId_archivedAt_idx" ON "notifications"("tenantId", "archivedAt");
CREATE INDEX "notifications_tenantId_status_idx" ON "notifications"("tenantId", "status");

-- Enforce group capacity for all database writers, including concurrent requests.
CREATE FUNCTION "enforce_group_member_max_size"() RETURNS TRIGGER AS $$
DECLARE
    group_max_size INTEGER;
    active_member_count INTEGER;
BEGIN
    IF NEW."archivedAt" IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT "maxSize" INTO group_max_size
    FROM "groups"
    WHERE "tenantId" = NEW."tenantId" AND "id" = NEW."groupId"
    FOR UPDATE;

    IF group_max_size IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO active_member_count
    FROM "group_members"
    WHERE "tenantId" = NEW."tenantId"
      AND "groupId" = NEW."groupId"
      AND "archivedAt" IS NULL
      AND "id" <> NEW."id";

    IF active_member_count >= group_max_size THEN
        RAISE EXCEPTION 'group_members_max_size'
            USING ERRCODE = '23514', CONSTRAINT = 'group_members_max_size';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "group_members_enforce_max_size"
BEFORE INSERT OR UPDATE OF "tenantId", "groupId", "archivedAt" ON "group_members"
FOR EACH ROW EXECUTE FUNCTION "enforce_group_member_max_size"();

CREATE FUNCTION "enforce_group_max_size_update"() RETURNS TRIGGER AS $$
DECLARE
    active_member_count INTEGER;
BEGIN
    IF NEW."maxSize" < OLD."maxSize" THEN
        SELECT COUNT(*) INTO active_member_count
        FROM "group_members"
        WHERE "tenantId" = OLD."tenantId"
          AND "groupId" = OLD."id"
          AND "archivedAt" IS NULL;
        IF active_member_count > NEW."maxSize" THEN
            RAISE EXCEPTION 'group_members_max_size'
                USING ERRCODE = '23514', CONSTRAINT = 'group_members_max_size';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "groups_enforce_max_size_update"
BEFORE UPDATE OF "maxSize" ON "groups"
FOR EACH ROW EXECUTE FUNCTION "enforce_group_max_size_update"();
