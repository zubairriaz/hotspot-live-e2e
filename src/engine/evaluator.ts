import { RuleSet, Rule } from "./rules";

export class Evaluator {
  private readonly ruleSet = new RuleSet();

  constructor() {
    this.ruleSet.add(new Rule("high-value", 10));
    this.ruleSet.add(new Rule("fx", 5));
    this.ruleSet.add(new Rule("micro", 2));
  }

  evaluate(amount: number, currency: string): string {
    const score = this.ruleSet.score(amount, currency);
    if (score >= 15) return "review";
    if (score >= 5) return "flag";
    return "allow";
  }
}
