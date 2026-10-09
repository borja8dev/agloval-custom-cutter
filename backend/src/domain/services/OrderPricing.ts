import { toCents } from './BoardPricing';

/**
 * Line pricing for the non-board units, in integer cents. Each function
 * rounds once, at the end, so float drift cannot add or lose a cent.
 */

/** UD: unit price x quantity. */
export function unitLineCents(unitPrice: number, quantity: number): number {
  return toCents(unitPrice) * quantity;
}

/**
 * ML: `pricePerMeter` x bar length in metres x number of bars. The integer
 * cents-per-metre is multiplied by the integer length before dividing by 100
 * cm, so the only rounding is the last one.
 */
export function linearLineCents(pricePerMeter: number, lengthCm: number, quantity: number): number {
  return Math.round((toCents(pricePerMeter) * lengthCm * quantity) / 100);
}
