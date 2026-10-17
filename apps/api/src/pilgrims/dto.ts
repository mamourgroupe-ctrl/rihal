import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  GENDERS,
  Gender,
  PILGRIM_STATUSES,
  PilgrimStatus,
} from '../domain/types';

const PASSPORT_PATTERN = /^[A-Z0-9]{5,20}$/i;

export class CreatePilgrimDto {
  @IsString({ message: 'الاسم العربي مطلوب' })
  @Length(2, 120, { message: 'الاسم العربي يجب أن يكون بين 2 و120 حرفاً' })
  fullNameAr!: string;

  @IsString({ message: 'الاسم الإنجليزي مطلوب' })
  @Length(2, 120, { message: 'الاسم الإنجليزي يجب أن يكون بين 2 و120 حرفاً' })
  fullNameEn!: string;

  @IsString({ message: 'رقم الجواز مطلوب' })
  @Matches(PASSPORT_PATTERN, {
    message: 'رقم الجواز يجب أن يتكون من 5 إلى 20 حرفاً/رقم',
  })
  passportNumber!: string;

  @IsDateString({}, { message: 'تاريخ انتهاء الجواز غير صالح' })
  passportExpiry!: string;

  @IsString({ message: 'الجنسية مطلوبة' })
  @Length(2, 3, { message: 'استخدم رمز الجنسية (مثل SAU, DZA)' })
  nationality!: string;

  @IsOptional()
  @IsDateString({}, { message: 'تاريخ الميلاد غير صالح' })
  dateOfBirth?: string;

  @IsOptional()
  @IsIn([...GENDERS], { message: 'الجنس يجب أن يكون MALE أو FEMALE' })
  gender?: Gender;

  @IsOptional()
  @IsString()
  @Length(6, 20, { message: 'رقم الهاتف غير صالح' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email?: string;

  @IsOptional()
  @IsIn([...PILGRIM_STATUSES], { message: 'حالة المعتمر غير صالحة' })
  status?: PilgrimStatus;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}

export class UpdatePilgrimDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  fullNameAr?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  fullNameEn?: string;

  @IsOptional()
  @IsString()
  @Matches(PASSPORT_PATTERN, {
    message: 'رقم الجواز يجب أن يتكون من 5 إلى 20 حرفاً/رقم',
  })
  passportNumber?: string;

  @IsOptional()
  @IsDateString()
  passportExpiry?: string;

  @IsOptional()
  @IsString()
  @Length(2, 3)
  nationality?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsIn([...GENDERS])
  gender?: Gender;

  @IsOptional()
  @IsString()
  @Length(6, 20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn([...PILGRIM_STATUSES])
  status?: PilgrimStatus;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}

export class ListPilgrimsQueryDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  search?: string;

  @IsOptional()
  @IsIn([...PILGRIM_STATUSES], { message: 'حالة المعتمر غير صالحة' })
  status?: PilgrimStatus;

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
