import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { INVOICE_STATUSES, InvoiceStatus } from '../domain/types';

export class InvoiceItemDto {
  @IsString({ message: 'وصف البند مطلوب' })
  @Length(2, 200, { message: 'وصف البند يجب أن يكون بين 2 و200 حرف' })
  description!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'الكمية غير صالحة' })
  @Min(0.01, { message: 'الكمية يجب أن تكون أكبر من صفر' })
  @Max(10_000, { message: 'الكمية كبيرة جداً' })
  quantity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'سعر الوحدة غير صالح' })
  @Min(0, { message: 'سعر الوحدة لا يمكن أن يكون سالباً' })
  @Max(1_000_000, { message: 'سعر الوحدة كبير جداً' })
  unitPrice!: number;
}

export class CreateInvoiceDto {
  @IsString({ message: 'اسم المشتري مطلوب' })
  @Length(2, 200, { message: 'اسم المشتري يجب أن يكون بين 2 و200 حرف' })
  buyerName!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{15}$/, { message: 'الرقم الضريبي يجب أن يكون 15 رقماً' })
  buyerVatNumber?: string;

  @IsOptional()
  @IsString()
  @Length(3, 64)
  pilgrimId?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'أضف بنداً واحداً على الأقل' })
  @ArrayMaxSize(50, { message: 'الحد الأقصى 50 بنداً' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];

  @IsOptional()
  @IsIn(['SAR', 'USD', 'EUR'], { message: 'العملة غير مدعومة' })
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(0.5)
  vatRate?: number;

  @IsOptional()
  @IsDateString({}, { message: 'تاريخ الاستحقاق غير صالح' })
  dueDate?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

export class ListInvoicesQueryDto {
  @IsOptional()
  @IsIn([...INVOICE_STATUSES], { message: 'حالة الفاتورة غير صالحة' })
  status?: InvoiceStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
