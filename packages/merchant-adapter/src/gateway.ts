import type { CheckoutSession } from "@accesspay/core";
export type ProviderOrder = {
  id: string;
  status: string;
  sessionId: string;
  currency: string;
  totalMinor: number;
  sellerId: string;
  capture?: {
    id: string;
    status: string;
    currency: string;
    totalMinor: number;
  };
};
export interface PaymentGateway {
  create(session: CheckoutSession, requestId: string): Promise<string>;
  get(orderId: string): Promise<ProviderOrder>;
  capture(orderId: string, requestId: string): Promise<ProviderOrder>;
}
