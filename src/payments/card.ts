export class Card {
  constructor(
    readonly number: string,
    readonly expiry: string,
    readonly cvv: string,
    readonly holder: string,
  ) {}

  isExpired(): boolean {
    const [monthRaw, yearRaw] = this.expiry.split("/").map(Number);
    const month = monthRaw || 1;
    const year = yearRaw || 0;
    const now = new Date();
    const exp = new Date(2000 + year, month - 1, 1);
    return exp <= now;
  }

  isValid(): boolean {
    if (this.isExpired()) return false;
    if (this.cvv.length < 3 || this.cvv.length > 4) return false;
    return this.passesLuhn();
  }

  masked(): string {
    const digits = this.number.replace(/\s/g, "");
    return `****-****-****-${digits.slice(-4)}`;
  }

  private passesLuhn(): boolean {
    const digits = this.number.replace(/\s/g, "");
    let sum = 0;
    let alternate = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]!, 10);
      if (alternate) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }
}
