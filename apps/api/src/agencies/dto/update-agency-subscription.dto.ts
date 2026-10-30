import { IsBoolean } from 'class-validator';

export class UpdateAgencySubscriptionDto {
  @IsBoolean()
  cancelAtPeriodEnd!: boolean;
}
