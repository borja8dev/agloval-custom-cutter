// User input
export interface Piece {
  width: number;
  height: number;
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

// ---------------------------------------------------------------------------
// Catalog (families, units) and orders
// ---------------------------------------------------------------------------

export type ProductUnit = 'UD' | 'M2' | 'ML';

// Product as returned by the catalog API. Board and bar dimensions are null
// when they do not apply to the unit (UD has none, ML only has lengthCm).
export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  unit: ProductUnit;
  familyCode: string;
  familyName: string;
  categoryName: string;
  standardWidth: number | null; // cm
  standardHeight: number | null; // cm
  thickness: number | null; // mm
  lengthCm: number | null;
  pricePerUnit: number; // EUR
  pricePerM2: number | null; // EUR
  currency: string;
}

export interface Family {
  code: string;
  name: string;
  productCount: number;
  units: Record<ProductUnit, number>;
}

export interface ProductListParams {
  family?: string;
  unit?: ProductUnit;
  limit?: number;
  skip?: number;
}

export interface ProductListResult {
  products: CatalogProduct[];
  count: number;
  total: number;
}

// POST /api/orders/quote request
export interface QuotePieceRequest {
  width: number;
  height: number;
  quantity?: number;
}

export interface QuoteLineRequest {
  productId: string;
  pieces?: QuotePieceRequest[]; // M2 only
  quantity?: number; // UD and ML only
}

export interface QuoteRequest {
  lines: QuoteLineRequest[];
}

// POST /api/orders/quote response
export interface QuoteProductSummary {
  id: string;
  sku: string;
  name: string;
  unit: ProductUnit;
  familyCode: string;
  familyName: string;
  thickness: number | null;
  boardWidth: number | null;
  boardHeight: number | null;
  lengthCm: number | null;
}

export interface QuoteBoardGroup {
  kind: 'BOARD';
  product: QuoteProductSummary;
  pieces: Array<{ width: number; height: number; quantity: number }>;
  pieceCount: number;
  usedAreaM2: number;
  boardAreaM2: number;
  /** Whole boards billed: ceil(used / board), an area-based estimate. */
  boardsNeeded: number;
  pricePerM2: number;
  /** Price of one whole board, rounded to cents. */
  pricePerBoard: number;
  /** boardsNeeded x pricePerBoard. */
  price: number;
}

export interface QuoteUnitGroup {
  kind: 'UNIT';
  product: QuoteProductSummary;
  quantity: number;
  unitPrice: number;
  price: number;
}

export interface QuoteLinearGroup {
  kind: 'LINEAR';
  product: QuoteProductSummary;
  quantity: number;
  lengthM: number;
  pricePerMeter: number;
  price: number;
}

export type QuoteGroup = QuoteBoardGroup | QuoteUnitGroup | QuoteLinearGroup;

export interface OrderQuote {
  groups: QuoteGroup[];
  total: number;
  currency: string;
  calculatedAt: string;
}

// POST /api/orders/submit
export interface Customer {
  name: string;
  email: string;
  phone: string;
}

export interface SubmitOrderRequest extends QuoteRequest {
  orderNumber: number;
  customer: Customer;
  privacyAccepted: true;
}

export interface SubmitOrderResponse {
  orderNumber: number;
  quote: OrderQuote;
  emails: { customer: 'sent'; agloval: 'sent' | 'skipped' };
}

// Local order state
export interface OrderPiece extends Piece {
  quantity: number;
}

export interface OrderBoardLine {
  id: string;
  product: CatalogProduct;
  pieces: OrderPiece[];
}

export interface OrderQuantityLine {
  id: string;
  product: CatalogProduct;
  quantity: number;
}

export type OrderLine = OrderBoardLine | OrderQuantityLine;

// Order history (localStorage)
export interface HistoryLine {
  productId: string;
  name: string;
  sku: string;
  unit: ProductUnit;
  pieces?: OrderPiece[];
  quantity?: number;
}

export interface OrderHistoryEntry {
  number: number;
  createdAt: string;
  total: number;
  currency: string;
  lines: HistoryLine[];
  groups: QuoteGroup[];
}
