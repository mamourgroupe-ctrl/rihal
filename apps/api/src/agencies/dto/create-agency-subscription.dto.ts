import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAgencySubscriptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  subscriptionPlanId!: string;
}
