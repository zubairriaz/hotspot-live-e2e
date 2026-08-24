/**
 * PaymentProcessor — Zone of Pain example
 *
 * Martin's Distance analysis:
 *   A (abstractness) = 0  — four concrete classes, zero interfaces / abstract classes
 *   I (instability)  = 0  — no imports from other project modules; nothing imports this yet
 *   D = |A + I - 1|  = 1.0  →  deep in the Zone of Pain
 *
 * Zone of Pain: the module is maximally stable yet maximally concrete.
 * The fix is to extract an interface (IPaymentGateway, IReceiptStore, etc.)
 * so dependents program to abstractions, pushing the module toward the Main Sequence.
 */

export class Money {
  constructor(
    readonly amount: number,
    readonly currency: string,
  ) {
    if (amount < 0) throw new RangeError("amount must be non-negative");
    if (!currency || currency.length !== 3) throw new TypeError("currency must be a 3-letter ISO code");
  }

  add(other: Money): Money {
    if (other.currency !== this.currency) throw new Error(`currency mismatch: ${this.currency} vs ${other.currency}`);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (other.currency !== this.currency) throw new Error(`currency mismatch: ${this.currency} vs ${other.currency}`);
    if (other.amount > this.amount) throw new RangeError("result would be negative");
    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) throw new RangeError("factor must be non-negative");
    return new Money(Math.round(this.amount * factor * 100) / 100, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }
}

export class Card {
  constructor(
    readonly number: string,
    readonly expiry: string,
    readonly cvv: string,
    readonly holder: string,
  ) {}

  isExpired(): boolean {
    const [month, year] = this.expiry.split("/").map(Number);
    const now = new Date();
    const exp = new Date(2000 + (year ?? 0), (month ?? 1) - 1, 1);
    return exp <= now;
  }

  isValid(): boolean {
    if (this.isExpired()) return false;
    if (this.cvv.length < 3 || this.cvv.length > 4) return false;
    // Luhn algorithm
    let sum = 0;
    let alternate = false;
    for (let i = this.number.replace(/\s/g, "").length - 1; i >= 0; i--) {
      let digit = parseInt(this.number.replace(/\s/g, "")[i]!, 10);
      if (alternate) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }

  masked(): string {
    const digits = this.number.replace(/\s/g, "");
    return `****-****-****-${digits.slice(-4)}`;
  }
}

export class Receipt {
  readonly id: string;
  readonly timestamp: Date;

  constructor(
    readonly amount: Money,
    readonly card: Card,
    readonly status: "approved" | "declined" | "error",
    readonly message: string,
  ) {
    this.id = `rcpt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.timestamp = new Date();
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      timestamp: this.timestamp.toISOString(),
      amount: this.amount.toString(),
      card: this.card.masked(),
      status: this.status,
      message: this.message,
    };
  }
}

export class PaymentProcessor {
  private readonly maxRetries = 3;
  private readonly dailyLimit: Money;
  private processed: Money;

  constructor(dailyLimitAmount: number, currency: string) {
    this.dailyLimit = new Money(dailyLimitAmount, currency);
    this.processed = new Money(0, currency);
  }

  process(amount: Money, card: Card): Receipt {
    if (!card.isValid()) {
      return new Receipt(amount, card, "declined", "Card validation failed: invalid or expired card");
    }

    if (amount.amount <= 0) {
      return new Receipt(amount, card, "declined", "Amount must be greater than zero");
    }

    try {
      const projected = this.processed.add(amount);
      if (projected.amount > this.dailyLimit.amount) {
        return new Receipt(amount, card, "declined", `Daily limit of ${this.dailyLimit} would be exceeded`);
      }
    } catch (e) {
      return new Receipt(amount, card, "error", `Limit check failed: ${(e as Error).message}`);
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const result = this.charge(amount, card, attempt);
      if (result.status === "approved") {
        try {
          this.processed = this.processed.add(amount);
        } catch {
          // non-fatal — limit tracking degraded
        }
        return result;
      }
      if (result.status === "declined") return result;
      // "error" → retry
    }

    return new Receipt(amount, card, "error", "Max retries exceeded — gateway unavailable");
  }

  private charge(amount: Money, card: Card, attempt: number): Receipt {
    // Simulated gateway call — replace with real HTTP integration
    const ok = Math.random() > 0.05;
    if (ok) {
      return new Receipt(amount, card, "approved", `Approved on attempt ${attempt}`);
    }
    return new Receipt(amount, card, "error", `Gateway timeout on attempt ${attempt}`);
  }

  remainingDailyCapacity(): Money {
    return this.dailyLimit.subtract(this.processed);
  }

  resetDailyTotals(): void {
    this.processed = new Money(0, this.dailyLimit.currency);
  }
}
