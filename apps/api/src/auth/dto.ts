import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email!: string;

  @IsString({ message: 'كلمة المرور مطلوبة' })
  @MinLength(8, { message: 'كلمة المرور يجب ألا تقل عن 8 أحرف' })
  password!: string;

  @IsOptional()
  @IsString()
  @Length(2, 64, { message: 'معرّف الوكالة غير صالح' })
  tenantSlug?: string;
}

export class RegisterDto {
  @IsString({ message: 'اسم الوكالة مطلوب' })
  @Length(2, 120, { message: 'اسم الوكالة يجب أن يكون بين 2 و120 حرفاً' })
  agencyName!: string;

  @IsString({ message: 'معرّف الوكالة مطلوب' })
  @Matches(/^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/, {
    message:
      'معرّف الوكالة: أحرف إنجليزية صغيرة وأرقام وشرطات (3-64 حرفاً)',
  })
  slug!: string;

  @IsString({ message: 'اسم المدير مطلوب' })
  @Length(2, 120)
  name!: string;

  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'كلمة المرور يجب ألا تقل عن 8 أحرف' })
  @Matches(/[A-Za-z]/, { message: 'كلمة المرور يجب أن تحتوي حرفاً واحداً على الأقل' })
  @Matches(/[0-9]/, { message: 'كلمة المرور يجب أن تحتوي رقماً واحداً على الأقل' })
  password!: string;

  @IsOptional()
  @IsString()
  @Length(6, 20)
  phone?: string;
}
