import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentTenantId, Roles } from '../auth/auth.decorators';
import { AUTH_ROLES } from '../auth/auth.types';
import type { Document } from '@rihal/database';
import { DocumentsService } from './documents.service';

const DOCUMENT_TYPES = ['PASSPORT', 'VISA', 'PHOTO', 'VACCINATION', 'INSURANCE', 'OTHER'] as const;
const WRITE_ROLES = ['ADMIN', 'OPERATOR', 'SUPERVISOR'] as const;

const listQuerySchema = z
  .object({
    pilgrimId: z.string().trim().min(1).optional(),
    verified: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
  })
  .strict();

const createSchema = z
  .object({
    pilgrimId: z.string().trim().min(1),
    type: z.enum(DOCUMENT_TYPES),
    storageKey: z.string().trim().min(3).max(300),
    fileName: z.string().trim().min(1).max(200),
    fileSize: z.number().int().min(1).max(50 * 1024 * 1024),
    mimeType: z.string().trim().min(3).max(120),
    ocrData: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

function parse<T>(schema: z.ZodType<T>, payload: unknown, message: string): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new BadRequestException({
      statusCode: 400,
      error: 'INVALID_INPUT',
      message,
      issues: result.error.issues.map(({ path, message: issue }) => `${path.join('.')}: ${issue}`),
    });
  }
  return result.data;
}

@Controller('documents')
@Roles(...AUTH_ROLES)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  async list(
    @CurrentTenantId() tenantId: string,
    @Query() query: unknown,
  ): Promise<{ items: Document[]; total: number; limit: number; offset: number }> {
    const options = parse(listQuerySchema, query ?? {}, 'Invalid document filters.');
    const result = await this.documents.list(tenantId, options);
    return { ...result, limit: options.limit, offset: options.offset };
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@CurrentTenantId() tenantId: string, @Body() body: unknown): Promise<Document> {
    const input = parse(createSchema, body, 'Invalid document data.');
    return this.documents.create(tenantId, {
      ...input,
      ocrData: input.ocrData as never,
    });
  }

  @Post(':id/verify')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  verify(@CurrentTenantId() tenantId: string, @Param('id') id: string): Promise<Document> {
    return this.documents.verify(tenantId, id);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    await this.documents.archive(tenantId, id);
  }
}
