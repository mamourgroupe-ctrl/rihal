import { Module } from '@nestjs/common';
import {
  DocumentsController,
  PilgrimDocumentsController,
} from './documents.controller';
import { DocumentsService } from './documents.service';
import { NoopOcrAdapter, OcrService } from './ocr.service';
import { DocumentStorageService } from './storage.service';

@Module({
  controllers: [PilgrimDocumentsController, DocumentsController],
  providers: [
    DocumentsService,
    OcrService,
    DocumentStorageService,
    { provide: NoopOcrAdapter, useClass: NoopOcrAdapter },
  ],
  exports: [DocumentsService, OcrService],
})
export class DocumentsModule {}
