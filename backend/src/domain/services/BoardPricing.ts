export interface PricedPiece {
  width: number; // cm
  height: number; // cm
  quantity?: number; // omitted means 1
}

export interface BoardPricingInput {
  pieces: PricedPiece[];
  boardAreaM2: number;
  pricePerM2: number | null; // null on legacy rows priced per board only
  pricePerUnit: number; // € per board, used only when pricePerM2 is null
}

export interface BoardPricingResult {
  /** € per m2: the product price, or pricePerUnit / boardArea on legacy rows. */
  pricePerM2: number;
  /** Informational price of one full board (boardArea x pricePerM2), rounded once. */
  pricePerBoard: number;
  /** Used area x pricePerM2, rounded once to 2 decimals. */
  totalPrice: number;
}

export const toCents = (euros: number): number => Math.round(euros * 100);

const CM2_PER_M2 = 10000;
const EPSILON = 1e-9;

/** cents = round(area cm2 x cents per m2 / 10,000), half rounded up, float noise ignored. */
const roundedCents = (areaCm2: number, centsPerM2: number): number =>
  Math.floor((areaCm2 * centsPerM2) / CM2_PER_M2 + 0.5 + EPSILON);

/**
 * Prices an M2 group by the area actually used (not by whole boards). The
 * area is summed in cm2 over all pieces and rounded to cents only once, so
 * neither per-piece rounding nor float drift can add or lose a cent. The
 * leftover of the last board is not charged.
 *
 * Legacy rows without pricePerM2 derive the m2 price as pricePerUnit / board
 * area, so no code path bills by boards any more.
 */
export function priceUsedArea(input: BoardPricingInput): BoardPricingResult {
  const { pieces, boardAreaM2, pricePerM2, pricePerUnit } = input;

  // Four decimals of cm2 absorb float noise without losing real precision.
  const usedAreaCm2 =
    Math.round(pieces.reduce((sum, p) => sum + p.width * p.height * (p.quantity ?? 1), 0) * 10000) /
    10000;
  const boardAreaCm2 = boardAreaM2 * CM2_PER_M2;

  const centsPerM2 =
    pricePerM2 !== null ? toCents(pricePerM2) : (toCents(pricePerUnit) * CM2_PER_M2) / boardAreaCm2;

  return {
    pricePerM2: pricePerM2 ?? toCents(centsPerM2 / 100) / 100,
    pricePerBoard:
      pricePerM2 !== null ? roundedCents(boardAreaCm2, centsPerM2) / 100 : pricePerUnit,
    totalPrice: roundedCents(usedAreaCm2, centsPerM2) / 100,
  };
}
