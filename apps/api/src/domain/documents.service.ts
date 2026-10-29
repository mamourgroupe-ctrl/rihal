import { Injectable } from '@nestjs/common';
import type { Document, DocumentType, PilgrimStatus, Prisma } from '@rihal/database';
import { PrismaService } from '../database/prisma.service';
import { DomainRuleError } from './domain.errors';

export interface CreateDocumentInput {
  pilgrimId: string;
  type: DocumentType;
  storageKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  ocrData?: Prisma.InputJsonValue;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(tenantId: string, input: CreateDocumentInput): Promise<Document> {
    const storageKey = input.storageKey.trim();
    if (
      !tenantId ||
      !input.pilgrimId ||
      !storageKey ||
      /^https?:\/\//i.test(storageKey) ||
      !input.fileName.trim() ||
      !Number.isSafeInteger(input.fileSize) ||
      input.fileSize < 1 ||
      !input.mimeType.trim()
    ) {
      throw new DomainRuleError('INVALID_INPUT', 'A private storage key and valid document metadata are required.');
    }

    return this.prismaService.withTenant(tenantId, async (tx) => {
      const pilgrim = await tx.pilgrim.findFirst({
        where: { id: input.pilgrimId, tenantId, archivedAt: null },
        select: { id: true, status: true },
      });
      if (!pilgrim) {
        throw new DomainRuleError('NOT_FOUND', 'Pilgrim not found.');
      }

      const document = await tx.document.create({
        data: {
          tenantId,
          pilgrimId: input.pilgrimId,
          type: input.type,
          storageKey,
          fileName: input.fileName.trim(),
          fileSize: input.fileSize,
          mimeType: input.mimeType.trim().toLowerCase(),
          ...(input.ocrData === undefined ? {} : { ocrData: input.ocrData }),
        },
      });

      if (pilgrim.status === ('REGISTERED' as PilgrimStatus)) {
        await tx.pilgrim.updateMany({
          where: {
            id: pilgrim.id,
            tenantId,
            status: 'REGISTERED' as PilgrimStatus,
            archivedAt: null,
          },
          data: { status: 'DOCUMENTS_UPLOADED' as PilgrimStatus },
        });
      }
      return document;
    });
  }

  async verify(tenantId: string, documentId: string): Promise<Document> {
    return this.prismaService.withTenant(tenantId, async (tx) => {
      const result = await tx.document.updateMany({
        where: { id: documentId, tenantId, archivedAt: null },
        data: { verified: true },
      });
      if (result.count !== 1) {
        throw new DomainRuleError('NOT_FOUND', 'Document not found.');
      }
      return tx.document.findFirstOrThrow({
        where: { id: documentId, tenantId, archivedAt: null },
      });
    });
  }

  async archive(tenantId: string, documentId: string): Promise<void> {
    await this.prismaService.withTenant(tenantId, async (tx) => {
      const result = await tx.document.updateMany({
        where: { id: documentId, tenantId, archivedAt: null },
        data: { archivedAt: new Date() },
      });
      if (result.count !== 1) {
        throw new DomainRuleError('NOT_FOUND', 'Document not found.');
      }
    });
  }
}
