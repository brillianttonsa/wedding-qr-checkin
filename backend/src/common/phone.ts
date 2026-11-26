import { BadRequestException } from '@nestjs/common';

/** Normalizes common Tanzanian local and international inputs to +255XXXXXXXXX. */
export function normalizeTanzanianPhone(value: string): string {
  const digits = value.trim().replace(/[\s()-]/g, '').replace(/^\+/, '');
  const local = digits.startsWith('0') ? digits.slice(1) : digits.startsWith('255') ? digits.slice(3) : digits;
  if (!/^\d{9}$/.test(local) || !/^[67]/.test(local)) {
    throw new BadRequestException('Phone number must be a valid Tanzanian mobile number');
  }
  return `+255${local}`;
}
