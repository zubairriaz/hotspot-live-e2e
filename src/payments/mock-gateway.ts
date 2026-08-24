import type { ChargeResult, IPaymentGateway } from "./gateway/gateway";

/**
 * In-memory gateway used by tests and demos. Approves ~95% of the time and
 * reports a transient timeout otherwise, so retry handling stays exercised.
 */
export class MockGateway implements IPaymentGateway {
  constructor(private readonly approvalRate = 0.95) {}

  charge(_amount: number, _currency: string, attempt: number): ChargeResult {
    if (Math.random() < this.approvalRate) {
      return { status: "approved", message: `Approved on attempt ${attempt}` };
    }
    return { status: "error", message: `Gateway timeout on attempt ${attempt}` };
  }
}
