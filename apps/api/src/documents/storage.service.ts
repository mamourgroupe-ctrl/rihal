import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

export interface UploadedFileLike {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Local filesystem storage for pilgrim documents.
 *
 * Files are written outside the web root and are only reachable through the
 * authenticated download endpoint — never served statically. Switching to S3
 * later means re-implementing `save/read/remove` (the keys already carry the
 * tenant/pilgrim prefix).
 */
@Injectable()
export class DocumentStorageService {
  private readonly logger = new Logger(DocumentStorageService.name);
  private readonly root = path.resolve(
    process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads'),
  );

  get maxBytes(): number {
    const megabytes = Number(process.env.MAX_UPLOAD_MB ?? 5);
    return (Number.isFinite(megabytes) && megabytes > 0 ? megabytes : 5) * 1024 * 1024;
  }

  async save(
    tenantId: string,
    pilgrimId: string,
    file: UploadedFileLike,
  ): Promise<{ key: string; fileName: string }> {
    const extension = ALLOWED_MIME_TYPES[file.mimetype];
    if (!extension) {
      throw new BadRequestException(
        'صيغة الملف غير مدعومة — المسموح: JPG أو PNG أو WEBP أو PDF',
      );
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('الملف فارغ أو لم يتم إرساله');
    }
    if (file.size > this.maxBytes) {
      throw new BadRequestException(
        `حجم الملف يتجاوز الحد المسموح (${Math.round(this.maxBytes / 1024 / 1024)} ميجابايت)`,
      );
    }

    const fileName = this.cleanName(file.originalname, extension);
    const key = path.posix.join(
      this.assertSegment(tenantId),
      this.assertSegment(pilgrimId),
      `${Date.now()}-${randomUUID()}${extension}`,
    );
    const absolute = this.absolutePath(key);

    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, file.buffer, { mode: 0o600 });
    return { key, fileName };
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(this.absolutePath(key));
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(this.absolutePath(key));
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        this.logger.warn(`Could not delete stored file ${key}: ${error?.message}`);
      }
    }
  }

  /** Prevents path traversal: the key must stay inside the storage root. */
  private absolutePath(key: string): string {
    if (!key || key.includes('\0')) {
      throw new BadRequestException('مسار ملف غير صالح');
    }
    const absolute = path.resolve(this.root, key);
    if (absolute !== this.root && !absolute.startsWith(this.root + path.sep)) {
      throw new BadRequestException('مسار ملف غير صالح');
    }
    return absolute;
  }

  private assertSegment(value: string): string {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
      throw new BadRequestException('معرّف غير صالح في مسار الملف');
    }
    return value;
  }

  private cleanName(originalName: string, extension: string): string {
    const base = path
      .basename(originalName || `document${extension}`)
      .replace(/[\u0000-\u001f<>:"/\\|?*]/g, '')
      .trim();
    const safe = base.length > 0 ? base : `document${extension}`;
    return safe.length > 180 ? safe.slice(0, 180) : safe;
  }
}
