export interface BoardPricingInput {
  boards: number; // whole boards billed
  boardAreaM2: number;
  pricePerM2: number | null; // null on legacy rows priced per board only
  pricePerUnit: number; // € per board, used only when pricePerM2 is null
}

export interface BoardPricingResult {
  /** Whole-board price snapshot, rounded to 2 decimals. */
  pricePerBoard: number;
  /** boards x boardArea x pricePerM2, rounded once to 2 decimals. */
  totalPrice: number;
}

const toCents = (euros: number): number => Math.round(euros * 100);

/**
 * Prices M2 products by whole boards at pricePerM2. Works in integer cents
 * and rounds only once at the end, so float drift cannot add or lose a cent.
 */
export function priceBoards(input: BoardPricingInput): BoardPricingResult {
  const { boards, boardAreaM2, pricePerM2, pricePerUnit } = input;

  if (pricePerM2 === null) {
    return {
      pricePerBoard: pricePerUnit,
      totalPrice: toCents(boards * pricePerUnit) / 100,
    };
  }

  const boardAreaCm2 = boardAreaM2 * 10000;
  const pricePerM2Cents = toCents(pricePerM2);
  // cents = boards x areaCm2 x (cents per m2) / 10,000 cm2 per m2
  const roundedCents = (units: number): number =>
    Math.floor(Math.round(units * boardAreaCm2 * pricePerM2Cents) / 10000 + 0.5);

  return {
    pricePerBoard: roundedCents(1) / 100,
    totalPrice: roundedCents(boards) / 100,
  };
}
