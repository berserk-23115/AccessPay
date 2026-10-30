import type { PublicSession } from "@accesspay/core";
export interface MerchantAdapter {
  getSession(): Promise<PublicSession>;
  createPayPalOrder(version: number): Promise<{ orderId: string }>;
  capturePayPalOrder(orderId: string): Promise<PublicSession>;
  getPaymentStatus(): Promise<PublicSession>;
}
export type FormResult = {
  error?: string;
  message?: string;
  code?: string;
  expiresAt?: string;
  answer?: string;
  sources?: string[];
  version?: number;
  mode?: string;
};
export type CheckoutActions = {
  review(form: FormData): Promise<void>;
  update(form: FormData): Promise<void>;
  cancel(form: FormData): Promise<void>;
  handoff(previous: FormResult, form: FormData): Promise<FormResult>;
  help(previous: FormResult, form: FormData): Promise<FormResult>;
};
