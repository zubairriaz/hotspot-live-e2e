export type EntryKind = "charge" | "refund" | "adjustment" | "fee" | "chargeback";
export type LedgerStatus = "pending" | "settled" | "disputed" | "reversed" | "written-off";

export interface LedgerEntry {
  id: string;
  kind: EntryKind;
  amount: number;
  currency: string;
  status: LedgerStatus;
  createdAt: Date;
  settledAt?: Date;
  reference?: string;
  metadata?: Record<string, unknown>;
}
