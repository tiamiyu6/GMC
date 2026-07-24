const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

export function generateVoucherCode(length = 10): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export const VOUCHER_GRACE_MINUTES = 10;

export function graceDeadline(from: Date = new Date()): Date {
  return new Date(from.getTime() + VOUCHER_GRACE_MINUTES * 60_000);
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60_000);
}
