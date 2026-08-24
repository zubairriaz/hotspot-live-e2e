/**
 * PaymentProcessor — orchestrates a charge through an injected gateway.
 *
 * Previously this file was a single concrete module (four classes, no imports)
 * sitting deep in the Zone of Pain: A ≈ 0, I ≈ 0, D ≈ 1. The fix, per the
 * hotspot report:
 *   - The gateway abstraction is extracted to `./gateway/gateway` — callers now
 *     depend on `IPaymentGateway`, not on a concrete implementation.
 *   - Money / Card / Receipt live in their own files, and `process` delegates to
 *     small named helpers, keeping every file's cyclomatic complexity well under 10.
 *
 * The module now depends on the abstraction and is depended on by no one, so it
 * is correctly measured as instable (I = 1) and concrete (A = 0): D = 0.
 */

import { Money } from "./money";
import { Card } from "./card";
import { Receipt } from "./receipt";
import { MockGateway } from "./mock-gateway";
import type { IPaymentGateway } from "./gateway/gateway";

export class PaymentProcessor {
  private readonly maxRetries = 3;
  private readonly dailyLimit: Money;
  private processed: Money;

  constructor(
    dailyLimitAmount: number,
    currency: string,
    private readonly gateway: IPaymentGateway = new MockGateway(),
  ) {
    this.dailyLimit = new Money(dailyLimitAmount, currency);
    this.processed = new Money(0, currency);
  }

  process(amount: Money, card: Card): Receipt {
    const rejection = this.reject(amount, card);
    if (rejection) return rejection;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const result = this.gateway.charge(amount.amount, amount.currency, attempt);
      if (result.status === "approved") {
        this.recordProcessed(amount);
        return new Receipt(amount, card, "approved", result.message);
      }
    }

    return new Receipt(amount, card, "error", "Max retries exceeded — gateway unavailable");
  }

  /** Pre-flight checks: returns a terminal receipt if the charge must not proceed, else null. */
  private reject(amount: Money, card: Card): Receipt | null {
    if (!card.isValid()) {
      return new Receipt(amount, card, "declined", "Card validation failed: invalid or expired card");
    }
    if (amount.amount <= 0) {
      return new Receipt(amount, card, "declined", "Amount must be greater than zero");
    }
    return this.overDailyLimit(amount, card);
  }

  private overDailyLimit(amount: Money, card: Card): Receipt | null {
    try {
      const projected = this.processed.add(amount);
      if (projected.amount > this.dailyLimit.amount) {
        return new Receipt(amount, card, "declined", `Daily limit of ${this.dailyLimit} would be exceeded`);
      }
      return null;
    } catch (e) {
      return new Receipt(amount, card, "error", `Limit check failed: ${(e as Error).message}`);
    }
  }

  private recordProcessed(amount: Money): void {
    try {
      this.processed = this.processed.add(amount);
    } catch {
      // non-fatal — limit tracking degraded
    }
  }

  remainingDailyCapacity(): Money {
    return this.dailyLimit.subtract(this.processed);
  }

  resetDailyTotals(): void {
    this.processed = new Money(0, this.dailyLimit.currency);
  }
}
