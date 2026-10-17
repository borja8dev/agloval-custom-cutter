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
  /** Price of one whole board (boardArea x pricePerM2 rounded to cents; pricePerUnit on legacy rows). */
  pricePerBoard: number;
  /** Boards to buy: the area-based estimate rounded up, minimum 1. */
  boardsNeeded: number;
  /** boardsNeeded x pricePerBoard, in exact cents. */
  totalPrice: number;
}

export const toCents = (euros: number): number => Math.round(euros * 100);

const CM2_PER_M2 = 10000;
const EPSILON = 1e-9;

/**
 * Whole boards to buy for an area: 3.7 boards of area -> 4, exactly 1.0 -> 1,
 * never fewer than 1. The epsilon keeps float noise (1.0000000000000002) from
 * adding a board. This is an area-based estimate, not a nesting layout, and it
 * is the single source of the count for pricing and for CuttingCalculator.
 */
export function boardsForArea(usedAreaM2: number, boardAreaM2: number): number {
  return Math.max(1, Math.ceil(usedAreaM2 / boardAreaM2 - EPSILON));
}

/** cents = round(area cm2 x cents per m2 / 10,000), half rounded up, float noise ignored. */
const roundedCents = (areaCm2: number, centsPerM2: number): number =>
  Math.floor((areaCm2 * centsPerM2) / CM2_PER_M2 + 0.5 + EPSILON);

/**
 * Prices an M2 group by the whole boards that must be bought. Boards are never
 * sold in fractions, so the area-based count is rounded up and the board price
 * (boardArea x pricePerM2) is rounded to cents once, before multiplying: the
 * unit price shown times the board count equals the total to the cent.
 *
 * Legacy rows without pricePerM2 use pricePerUnit as the board price and show
 * pricePerUnit / board area as the m2 rate.
 */
export function priceWholeBoards(input: BoardPricingInput): BoardPricingResult {
  const { pieces, boardAreaM2, pricePerM2, pricePerUnit } = input;

  // Four decimals of cm2 absorb float noise without losing real precision.
  const usedAreaCm2 =
    Math.round(pieces.reduce((sum, p) => sum + p.width * p.height * (p.quantity ?? 1), 0) * 10000) /
    10000;
  const boardAreaCm2 = boardAreaM2 * CM2_PER_M2;
  const boardsNeeded = boardsForArea(usedAreaCm2 / CM2_PER_M2, boardAreaM2);

  const boardCents =
    pricePerM2 !== null ? roundedCents(boardAreaCm2, toCents(pricePerM2)) : toCents(pricePerUnit);
  const ratePerM2 =
    pricePerM2 ?? toCents((toCents(pricePerUnit) * CM2_PER_M2) / boardAreaCm2 / 100) / 100;

  return {
    pricePerM2: ratePerM2,
    pricePerBoard: boardCents / 100,
    boardsNeeded,
    totalPrice: (boardsNeeded * boardCents) / 100,
  };
}
