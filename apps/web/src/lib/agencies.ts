import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  billingInterval: string;
  price: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgencySubscription {
  id: string;
  tenantId: string;
  subscriptionPlanId: string;
  status: string;
  startsAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  price: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  plan: SubscriptionPlan;
}

export async function listAgencies(): Promise<AgencySubscription[]> {
  const { data } = await apiClient.get<AgencySubscription[]>('/agencies/subscription/list');
  return data;
}

export function useAgencies() {
  return useQuery({
    queryKey: ['agencies'],
    queryFn: listAgencies,
  });
}
