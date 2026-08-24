/**
 * Payment gateway abstraction.
 *
 * This module is intentionally pure abstraction — one interface plus the value
 * types it speaks in, zero concrete classes. That makes it maximally abstract
 * (A = 1) and, since callers depend on it but it depends on nothing, maximally
 * stable (I = 0), so it sits on Martin's Main Sequence at D = |A + I - 1| = 0.
 *
 * `PaymentProcessor` and every concrete gateway depend on `IPaymentGateway`,
 * not on each other.
 */

export type ChargeStatus = "approved" | "error";

export interface ChargeResult {
  readonly status: ChargeStatus;
  readonly message: string;
}

export interface IPaymentGateway {
  /** Attempt to charge `amount` (minor units of `currency`) on the given retry attempt. */
  charge(amount: number, currency: string, attempt: number): ChargeResult;
}
