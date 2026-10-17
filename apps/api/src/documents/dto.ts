import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { DOCUMENT_TYPES, DocumentType } from '../domain/types';

export class UploadDocumentDto {
  @IsIn([...DOCUMENT_TYPES], { message: 'نوع الوثيقة غير صالح' })
  type!: DocumentType;

  /**
   * Optional MRZ (two lines) typed or scanned from the passport. When present
   * it is parsed and validated against the pilgrim record.
   */
  @IsOptional()
  @IsString()
  @Length(0, 6000, { message: 'نص الرمز الآلي طويل جداً' })
  ocrText?: string;
}

export class VerifyDocumentDto {
  @Transform(({ value }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : value,
  )
  @IsBoolean({ message: 'قيمة التحقق يجب أن تكون صحيحة أو خاطئة' })
  verified!: boolean;
}
