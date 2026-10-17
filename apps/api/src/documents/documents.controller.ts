import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/auth.decorators';
import { Tenant } from '../common/tenant';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto, VerifyDocumentDto } from './dto';

/** 25 MB hard cap at the transport layer; the service enforces MAX_UPLOAD_MB. */
const MULTER_LIMIT = 25 * 1024 * 1024;

@Controller('pilgrims/:pilgrimId/documents')
export class PilgrimDocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  /** GET /api/pilgrims/:id/documents — files + readiness checklist. */
  @Get()
  list(@Tenant() tenantId: string, @Param('pilgrimId') pilgrimId: string) {
    return this.documents.list(tenantId, pilgrimId);
  }

  /** POST /api/pilgrims/:id/documents — multipart: file + type + optional ocrText. */
  @Roles('ADMIN', 'OPERATOR', 'SUPERVISOR')
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MULTER_LIMIT } }))
  upload(
    @Tenant() tenantId: string,
    @Param('pilgrimId') pilgrimId: string,
    @UploadedFile() file: any,
    @Body() body: UploadDocumentDto,
  ) {
    return this.documents.upload(tenantId, pilgrimId, file, {
      type: body.type,
      ocrText: body.ocrText,
    });
  }
}

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  /** GET /api/documents/:id — metadata only. */
  @Get(':id')
  findOne(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.documents.findOne(tenantId, id);
  }

  /**
   * GET /api/documents/:id/download — streams the file to an authenticated
   * member of the owning tenant. Files are never exposed as public URLs.
   */
  @Get(':id/download')
  async download(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Res() res: any,
  ) {
    const { document, buffer } = await this.documents.download(tenantId, id);

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(
        document.fileName,
      )}`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(buffer);
  }

  /** PATCH /api/documents/:id/verify — operator marks the file verified. */
  @Roles('ADMIN', 'SUPERVISOR')
  @Patch(':id/verify')
  verify(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: VerifyDocumentDto,
  ) {
    return this.documents.setVerified(tenantId, id, body.verified);
  }

  /** DELETE /api/documents/:id */
  @Roles('ADMIN', 'SUPERVISOR')
  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.documents.remove(tenantId, id);
  }
}
