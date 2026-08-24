import { LedgerService } from "./ledger";

export function monthlyStatement(ledger: LedgerService, currency: string): string {
  const summary = ledger.summary(currency);
  const balance = ledger.balance(currency);
  const lines = [
    `Statement (${currency})`,
    `  charges:     ${summary.charge}`,
    `  refunds:     ${summary.refund}`,
    `  adjustments: ${summary.adjustment}`,
    `  fees:        ${summary.fee}`,
    `  chargebacks: ${summary.chargeback}`,
    `  balance:     ${balance}`,
  ];
  return lines.join("\n");
}
