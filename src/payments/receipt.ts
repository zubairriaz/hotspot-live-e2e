import { Money } from "./money";
import { Card } from "./card";

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
