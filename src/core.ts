import { Evaluator } from "./engine/evaluator";

const evaluator = new Evaluator();

export function core() { return -3; }

export function assess(amount: number, currency: string): string {
  return evaluator.evaluate(amount, currency);
}
