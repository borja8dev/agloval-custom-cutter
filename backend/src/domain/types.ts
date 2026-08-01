export interface Piece {
  width: number; // cm
  height: number; // cm
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
  boardsNeeded: number; // 1.2 = 1 board + 20% of another
  wastePercentage: number; // % of purchased area not used

  pieceCount: number;
  averagePieceSize: number; // m²

  isValid: boolean;
  errors: string[];
}
