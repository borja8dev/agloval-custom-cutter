/**
 * Output contract: what the server responds.
 *
 * MIGRATION: This is what the frontend renders. Changing its shape
 * breaks the frontend and the BD-real migration mapping.
 */
export interface CalculationResponseDTO {
  /** Unique calculation ID (for history/auditing). */
  id: string;

  product: {
    id: string;
    name: string;
    categoryName: string;
  };

  board: {
    width: number; // cm
    height: number; // cm
    thickness: number; // mm
    area: number; // m²
  };

  /** Echo of the user's input. */
  requestedPieces: Array<{
    width: number;
    height: number;
  }>;

  /** Output of CuttingCalculator. */
  calculation: {
    totalAreaNeeded: number; // m²
    boardsNeeded: number; // 1.2 = 1 board + 20%
    wastePercentage: number; // %
    pieceCount: number;
    averagePieceSize: number; // m²
  };

  /**
   * MIGRATION: pricePerBoard is captured at calculation time so a
   * calculation can be audited later (what was the price 3 months ago?).
   */
  pricing: {
    pricePerBoard: number; // €
    boardsNeeded: number; // same as calculation.boardsNeeded
    totalPrice: number; // € = pricePerBoard × boardsNeeded
    currency: string; // "EUR"
  };

  metadata: {
    calculatedAt: string; // ISO 8601
    validUntilDays?: number; // quote validity window
    status: 'DRAFT' | 'SUBMITTED' | 'COMPLETED';
  };

  /** Only set on partial/batch-failure responses; unused in this phase. */
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

/** Success response wrapper (REST convention). */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}
