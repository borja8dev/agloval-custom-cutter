// Product catalog
export interface Product {
  id: string;
  name: string;
  categoryName: string;
  standardWidth: number; // cm
  standardHeight: number; // cm
  thickness: number; // mm
  pricePerUnit: number; // €
  currency: string;
}

// User input
export interface Piece {
  width: number;
  height: number;
}

// Calculation request
export interface CalculationRequest {
  productId: string;
  requestedPieces: Piece[];
  userId?: string;
  metadata?: {
    source?: string;
    userEmail?: string;
  };
}

// Calculation response (from API)
export interface CalculationResponse {
  id: string;
  product: {
    id: string;
    name: string;
    categoryName: string;
  };
  board: {
    width: number;
    height: number;
    thickness: number;
    area: number;
  };
  requestedPieces: Piece[];
  calculation: {
    totalAreaNeeded: number;
    boardsNeeded: number;
    wastePercentage: number;
    pieceCount: number;
    averagePieceSize: number;
  };
  pricing: {
    pricePerBoard: number;
    boardsNeeded: number;
    totalPrice: number;
    currency: string;
  };
  metadata: {
    calculatedAt: string;
    validUntilDays?: number;
    status: 'DRAFT' | 'SUBMITTED' | 'COMPLETED';
  };
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

// Calculation state (local app state)
export interface CalculationState {
  productId: string | null;
  selectedProduct: Product | null;
  pieces: Piece[];
  calculation: CalculationResponse | null;
  isLoading: boolean;
  error: string | null;
}
