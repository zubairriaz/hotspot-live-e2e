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
