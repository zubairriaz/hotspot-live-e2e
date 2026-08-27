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

export class LedgerService {
  private entries: LedgerEntry[] = [];
  private readonly maxEntries = 10_000;
  private readonly currencies = ["USD", "EUR", "GBP"];

  record(entry: LedgerEntry): void {
    if (!entry.id || entry.id.trim() === "") {
      throw new Error("Entry id is required");
    }
    if (entry.amount <= 0) {
      throw new Error("Amount must be positive");
    }
    if (!this.currencies.includes(entry.currency)) {
      throw new Error(`Unsupported currency: ${entry.currency}`);
    }
    if (this.entries.length >= this.maxEntries) {
      throw new Error("Ledger capacity exceeded");
    }
    if (this.entries.find((e) => e.id === entry.id)) {
      throw new Error(`Duplicate entry id: ${entry.id}`);
    }
    this.entries.push({ ...entry });
  }

  settle(id: string): void {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) throw new Error(`Entry not found: ${id}`);
    if (entry.status === "settled") return;
    if (entry.status === "reversed") throw new Error("Cannot settle a reversed entry");
    if (entry.status === "written-off") throw new Error("Cannot settle a written-off entry");
    if (entry.status === "disputed") throw new Error("Resolve dispute before settling");
    entry.status = "settled";
    entry.settledAt = new Date();
  }

  reverse(id: string): void {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) throw new Error(`Entry not found: ${id}`);
    if (entry.status === "reversed") return;
    if (entry.status === "written-off") throw new Error("Cannot reverse a written-off entry");
    if (entry.status === "pending") throw new Error("Cannot reverse a pending entry — settle first");
    entry.status = "reversed";
  }

  balance(currency: string, kind?: EntryKind): number {
    let total = 0;
    for (const e of this.entries) {
      if (e.currency !== currency) continue;
      if (e.status === "reversed" || e.status === "written-off") continue;
      if (kind && e.kind !== kind) continue;
      if (e.kind === "charge" || e.kind === "fee") {
        total += e.amount;
      } else if (e.kind === "refund" || e.kind === "adjustment" || e.kind === "chargeback") {
        total -= e.amount;
      }
    }
    return total;
  }

  summary(currency: string): Record<EntryKind, number> {
    const out: Record<EntryKind, number> = { charge: 0, refund: 0, adjustment: 0, fee: 0, chargeback: 0 };
    for (const e of this.entries) {
      if (e.currency !== currency) continue;
      if (e.status === "reversed" || e.status === "written-off") continue;
      if (e.kind === "charge") out.charge += e.amount;
      else if (e.kind === "refund") out.refund += e.amount;
      else if (e.kind === "adjustment") out.adjustment += e.amount;
      else if (e.kind === "fee") out.fee += e.amount;
      else if (e.kind === "chargeback") out.chargeback += e.amount;
    }
    return out;
  }

  dispute(id: string, reason: string): void {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) throw new Error(`Entry not found: ${id}`);
    if (entry.status === "settled") { entry.status = "disputed"; return; }
    if (entry.status === "reversed") throw new Error("Cannot dispute a reversed entry");
    if (entry.status === "written-off") throw new Error("Cannot dispute a written-off entry");
    if (entry.status === "disputed") return;
    if (!reason || reason.trim() === "") throw new Error("Dispute reason required");
    entry.status = "disputed";
    entry.metadata = { ...entry.metadata, disputeReason: reason };
  }

  writeOff(id: string): void {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) throw new Error(`Entry not found: ${id}`);
    if (entry.status === "written-off") return;
    if (entry.status === "reversed") throw new Error("Cannot write off a reversed entry");
    if (entry.status === "settled") throw new Error("Cannot write off a settled entry");
    entry.status = "written-off";
  }

  aging(currency: string, asOf = new Date()): { current: number; thirtyDay: number; sixtyDay: number; ninetyPlus: number } {
    let current = 0; let thirtyDay = 0; let sixtyDay = 0; let ninetyPlus = 0;
    for (const e of this.entries) {
      if (e.currency !== currency) continue;
      if (e.status !== "pending") continue;
      const ageDays = Math.floor((asOf.getTime() - e.createdAt.getTime()) / 86_400_000);
      if (ageDays <= 30) current += e.amount;
      else if (ageDays <= 60) thirtyDay += e.amount;
      else if (ageDays <= 90) sixtyDay += e.amount;
      else ninetyPlus += e.amount;
    }
    return { current, thirtyDay, sixtyDay, ninetyPlus };
  }

  settleAll(currency: string): number {
    let count = 0;
    for (const e of this.entries) {
      if (e.currency !== currency) continue;
      if (e.status !== "pending") continue;
      if (e.kind === "chargeback" || e.kind === "adjustment") continue;
      e.status = "settled";
      e.settledAt = new Date();
      count++;
    }
    return count;
  }

  reconcile(expected: number, currency: string): { matched: boolean; diff: number; entries: LedgerEntry[] } {
    const actual = this.balance(currency);
    const diff = actual - expected;
    const suspicious: LedgerEntry[] = [];
    for (const e of this.entries) {
      if (e.currency !== currency) continue;
      if (e.status === "disputed") suspicious.push(e);
      else if (e.status === "pending" && e.kind === "charge") suspicious.push(e);
      else if (!e.settledAt && e.kind !== "adjustment") suspicious.push(e);
    }
    return { matched: diff === 0, diff, entries: suspicious };
  }
}
