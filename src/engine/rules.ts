// Concrete rule engine. No interfaces, no abstractions, imports nothing.
// Several modules depend on it, so it is stable AND concrete:
//   A = 0 (no abstract types), Ce = 0 (imports nothing), Ca > 0 (depended upon)
//   I = Ce / (Ce + Ca) = 0
//   D = |A + I - 1| = 1.0  -> Zone of Pain

export class Rule {
  constructor(
    public readonly name: string,
    public readonly weight: number,
  ) {}

  applies(amount: number, currency: string): boolean {
    if (this.name === "high-value") return amount > 10_000;
    if (this.name === "fx") return currency !== "USD";
    if (this.name === "micro") return amount < 1;
    return false;
  }
}

export class RuleSet {
  private rules: Rule[] = [];

  add(rule: Rule): void {
    if (this.rules.some((r) => r.name === rule.name)) {
      throw new Error(`Duplicate rule: ${rule.name}`);
    }
    this.rules.push(rule);
  }

  score(amount: number, currency: string): number {
    let total = 0;
    for (const r of this.rules) {
      if (r.applies(amount, currency)) total += r.weight;
    }
    return total;
  }

  names(): string[] {
    return this.rules.map((r) => r.name);
  }
}
