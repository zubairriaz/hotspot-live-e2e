import { RuleSet } from "./engine/rules";

export function log(m: string) { process.stdout.write(m + '\n'); }

export function describeRules(set: RuleSet): string {
  return set.names().join(", ");
}
