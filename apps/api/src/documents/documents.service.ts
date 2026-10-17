import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { DataService } from '../domain/data.service';
import {
  DOCUMENT_TYPES,
  DocumentChecklistItem,
  DocumentReadiness,
  DocumentType,
  PassportOcrResult,
  Pilgrim,
  PilgrimDocument,
  PilgrimDocumentsView,
  REQUIRED_DOCUMENT_TYPES,
} from '../domain/types';
import { OcrService } from './ocr.service';
import { DocumentStorageService, UploadedFileLike } from './storage.service';

export interface UploadDocumentPayload {
  type: DocumentType;
  ocrText?: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly data: DataService,
    private readonly ocr: OcrService,
    private readonly storage: DocumentStorageService,
  ) {}

  async list(tenantId: string, pilgrimId: string): Promise<PilgrimDocumentsView> {
    await this.assertPilgrim(tenantId, pilgrimId);
    const items = await this.data.listDocuments(tenantId, pilgrimId);
    return {
      items: items.map((document) => this.toPublic(document)),
      readiness: this.buildReadiness(items),
    };
  }

  async upload(
    tenantId: string,
    pilgrimId: string,
    file: UploadedFileLike | undefined,
    payload: UploadDocumentPayload,
  ): Promise<{ document: PilgrimDocument; readiness: DocumentReadiness }> {
    const pilgrim = await this.assertPilgrim(tenantId, pilgrimId);

    if (!file) {
      throw new BadRequestException('لم يتم إرفاق أي ملف');
    }
    if (file.size > this.storage.maxBytes) {
      throw new BadRequestException(
        `حجم الملف يتجاوز الحد المسموح (${Math.round(
          this.storage.maxBytes / 1024 / 1024,
        )} ميجابايت)`,
      );
    }

    const saved = await this.storage.save(tenantId, pilgrimId, file);

    let ocrData: PassportOcrResult | null = null;
    let verified = false;
    if (payload.type === 'PASSPORT') {
      const parsed = this.ocr.parsePassportMrz(payload.ocrText);
      ocrData = parsed
        ? this.compareWithPilgrim(parsed, pilgrim)
        : { source: 'none', mismatches: [] };
      verified = Boolean(
        ocrData.source === 'mrz' &&
          ocrData.checkDigitsValid &&
          ocrData.mismatches.length === 0,
      );
    }

    let document: PilgrimDocument;
    try {
      document = await this.data.createDocument(tenantId, pilgrimId, {
        type: payload.type,
        fileUrl: saved.key,
        fileName: saved.fileName,
        fileSize: file.size,
        mimeType: file.mimetype,
        ocrData,
        verified,
      });
    } catch (error) {
      // Never leave orphaned bytes behind when the record cannot be stored.
      await this.storage.remove(saved.key);
      throw error;
    }

    const readiness = await this.refreshReadiness(tenantId, pilgrimId);
    return { document: this.toPublic(document), readiness };
  }

  async findOne(tenantId: string, documentId: string): Promise<PilgrimDocument> {
    return this.toPublic(await this.findRecord(tenantId, documentId));
  }

  private async findRecord(
    tenantId: string,
    documentId: string,
  ): Promise<PilgrimDocument> {
    const document = await this.data.findDocument(tenantId, documentId);
    if (!document) {
      throw new HttpException('الوثيقة غير موجودة', HttpStatus.NOT_FOUND);
    }
    return document;
  }

  async download(
    tenantId: string,
    documentId: string,
  ): Promise<{ document: PilgrimDocument; buffer: Buffer }> {
    const document = await this.findRecord(tenantId, documentId);
    try {
      const buffer = await this.storage.read(document.fileUrl);
      return { document, buffer };
    } catch {
      throw new HttpException(
        'ملف الوثيقة غير موجود على الخادم',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async setVerified(
    tenantId: string,
    documentId: string,
    verified: boolean,
  ): Promise<{ document: PilgrimDocument; readiness: DocumentReadiness }> {
    const document = await this.findRecord(tenantId, documentId);
    const updated = await this.data.setDocumentVerified(
      tenantId,
      document.id,
      verified,
    );
    const readiness = await this.refreshReadiness(tenantId, document.pilgrimId);
    return {
      document: this.toPublic(updated ?? document),
      readiness,
    };
  }

  async remove(
    tenantId: string,
    documentId: string,
  ): Promise<{ readiness: DocumentReadiness }> {
    const document = await this.findRecord(tenantId, documentId);
    await this.data.deleteDocument(tenantId, documentId);
    await this.storage.remove(document.fileUrl);
    const readiness = await this.refreshReadiness(tenantId, document.pilgrimId);
    return { readiness };
  }

  /** Latest document per type + which required documents are still missing. */
  buildReadiness(documents: PilgrimDocument[]): DocumentReadiness {
    const latest = new Map<DocumentType, PilgrimDocument>();
    for (const document of documents) {
      if (!latest.has(document.type)) latest.set(document.type, document);
    }

    const now = Date.now();
    const checklist: DocumentChecklistItem[] = DOCUMENT_TYPES.map((type) => {
      const document = latest.get(type);
      const expiresAt =
        type === 'PASSPORT' ? document?.ocrData?.passportExpiry ?? null : null;
      return {
        type,
        required: REQUIRED_DOCUMENT_TYPES.includes(type),
        uploaded: Boolean(document),
        verified: document?.verified ?? false,
        documentId: document?.id,
        fileName: document?.fileName,
        createdAt: document?.createdAt,
        expiresAt,
        expired: expiresAt ? new Date(expiresAt).getTime() < now : false,
      };
    });

    const missing = REQUIRED_DOCUMENT_TYPES.filter((type) => !latest.has(type));
    const complete = missing.length === 0;
    const allVerified = REQUIRED_DOCUMENT_TYPES.every(
      (type) => latest.get(type)?.verified === true,
    );
    const passportExpired = checklist.some(
      (item) => item.type === 'PASSPORT' && item.expired,
    );

    return {
      required: [...REQUIRED_DOCUMENT_TYPES],
      missing,
      complete,
      readyForBooking: complete && allVerified && !passportExpired,
      checklist,
    };
  }

  // --------------------------------------------------------------- internals

  /** Hides the internal storage key from every API response. */
  private toPublic(document: PilgrimDocument): PilgrimDocument {
    const { fileUrl: _fileUrl, ...safe } = document;
    return safe as PilgrimDocument;
  }

  private async refreshReadiness(
    tenantId: string,
    pilgrimId: string,
  ): Promise<DocumentReadiness> {
    const [pilgrim, documents] = await Promise.all([
      this.data.findPilgrim(tenantId, pilgrimId),
      this.data.listDocuments(tenantId, pilgrimId),
    ]);
    const readiness = this.buildReadiness(documents);
    if (pilgrim) {
      await this.syncPilgrimStatus(tenantId, pilgrim, readiness, documents.length);
    }
    return readiness;
  }

  /**
   * Keeps the pilgrim pipeline honest: documents drive the status forward,
   * and removing documents moves it back while the pilgrim is still in the
   * document phase. Later stages (BOOKED, COMPLETED …) are never touched.
   */
  private async syncPilgrimStatus(
    tenantId: string,
    pilgrim: Pilgrim,
    readiness: DocumentReadiness,
    documentCount: number,
  ): Promise<void> {
    const editable = [
      'DRAFT',
      'REGISTERED',
      'DOCUMENTS_UPLOADED',
      'READY_FOR_BOOKING',
    ];
    if (!editable.includes(pilgrim.status)) return;

    // Ladder: DRAFT → REGISTERED (any file) → DOCUMENTS_UPLOADED (all
    // required files) → READY_FOR_BOOKING (all verified, passport valid).
    let next = pilgrim.status;
    if (readiness.readyForBooking) {
      next = 'READY_FOR_BOOKING';
    } else if (readiness.complete) {
      next = 'DOCUMENTS_UPLOADED';
    } else if (documentCount > 0) {
      next = 'REGISTERED';
    } else {
      next = 'DRAFT';
    }
    if (next === 'DRAFT' && pilgrim.status !== 'DRAFT') next = 'REGISTERED';

    if (next !== pilgrim.status) {
      await this.data.updatePilgrim(tenantId, pilgrim.id, { status: next as any });
    }
  }

  private compareWithPilgrim(
    parsed: PassportOcrResult,
    pilgrim: Pilgrim,
  ): PassportOcrResult {
    const mismatches = [...parsed.mismatches];

    if (
      parsed.passportNumber &&
      parsed.passportNumber.toUpperCase() !== pilgrim.passportNumber.toUpperCase()
    ) {
      mismatches.push(
        `رقم الجواز في الوثيقة (${parsed.passportNumber}) لا يطابق سجل المعتمر (${pilgrim.passportNumber})`,
      );
    }

    if (parsed.passportExpiry) {
      const documentExpiry = new Date(parsed.passportExpiry).getTime();
      const recordExpiry = new Date(pilgrim.passportExpiry).getTime();
      if (Math.abs(documentExpiry - recordExpiry) > 86_400_000) {
        mismatches.push(
          `تاريخ انتهاء الجواز في الوثيقة (${parsed.passportExpiry}) لا يطابق السجل (${pilgrim.passportExpiry.slice(0, 10)})`,
        );
      }
    }

    if (parsed.checkDigitsValid === false) {
      mismatches.push('أرقام التحقق في الرمز الآلي (MRZ) غير صحيحة');
    }

    return { ...parsed, mismatches };
  }

  private async assertPilgrim(
    tenantId: string,
    pilgrimId: string,
  ): Promise<Pilgrim> {
    const pilgrim = await this.data.findPilgrim(tenantId, pilgrimId);
    if (!pilgrim) {
      throw new HttpException('المعتمر غير موجود', HttpStatus.NOT_FOUND);
    }
    return pilgrim;
  }
}
