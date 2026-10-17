import { Body, Controller, Get, Patch } from '@nestjs/common';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import { AuthenticatedUser } from '../domain/types';
import { DataService } from '../domain/data.service';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @Length(2, 120, { message: 'اسم الوكالة يجب أن يكون بين 2 و120 حرفاً' })
  name?: string;

  @IsOptional()
  @Matches(/^\d{15}$/, { message: 'الرقم الضريبي يجب أن يكون 15 رقماً' })
  vatNumber?: string;

  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'السجل التجاري يجب أن يكون 10 أرقام' })
  crNumber?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  addressLine?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  city?: string;
}

/** Tenant profile — the ZATCA seller identity printed on every invoice. */
@Controller('tenant')
export class TenantController {
  constructor(private readonly data: DataService) {}

  @Get()
  async current(@CurrentUser() user: AuthenticatedUser) {
    return this.data.findTenantById(user.tenantId);
  }

  @Roles('ADMIN')
  @Patch()
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateTenantDto,
  ) {
    return this.data.updateTenant(user.tenantId, body);
  }
}
