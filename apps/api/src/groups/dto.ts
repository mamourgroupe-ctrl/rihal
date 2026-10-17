import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { GROUP_STATUSES, GroupStatus } from '../domain/types';

export class CreateGroupDto {
  @IsString({ message: 'اسم المجموعة مطلوب' })
  @Length(2, 120, { message: 'اسم المجموعة يجب أن يكون بين 2 و120 حرفاً' })
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20, { message: 'الحد الأقصى للمجموعة 20 عضواً' })
  maxSize?: number;

  @IsOptional()
  @IsIn([...GROUP_STATUSES], { message: 'حالة المجموعة غير صالحة' })
  status?: GroupStatus;

  @IsOptional()
  @IsDateString({}, { message: 'تاريخ الرحلة غير صالح' })
  scheduledDate?: string;
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxSize?: number;

  @IsOptional()
  @IsIn([...GROUP_STATUSES])
  status?: GroupStatus;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}

export class ListGroupsQueryDto {
  @IsOptional()
  @IsIn([...GROUP_STATUSES], { message: 'حالة المجموعة غير صالحة' })
  status?: GroupStatus;
}

export class AddMemberDto {
  @IsString({ message: 'معرّف المعتمر مطلوب' })
  @Length(3, 64)
  pilgrimId!: string;

  @IsOptional()
  @IsBoolean()
  isLeader?: boolean;
}
