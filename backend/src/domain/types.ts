export interface Piece {
  width: number; // cm
  height: number; // cm
  /** Identical copies of this piece (integer >= 1). Omitted means 1. */
  quantity?: number;
}

export interface BoardDimensions {
  width: number; // cm
  height: number; // cm
  thickness?: number; // mm (metadata, not used in the area calculation)
}

export interface CalculationResult {
  requestedPieces: Piece[];
  boardDimensions: BoardDimensions;

  totalAreaNeeded: number; // m²
  boardArea: number; // m² (the standard board)
  boardsNeeded: number; // whole boards billed (ceil of used area / board area)
  wastePercentage: number; // % of purchased area not used

  pieceCount: number;
  averagePieceSize: number; // m²

  isValid: boolean;
  errors: string[];
}
