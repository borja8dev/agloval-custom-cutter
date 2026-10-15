/**
 * Stateless order quote contract (POST /api/orders/quote): nothing is stored,
 * the client re-sends the whole order on every change.
 */

/** One line of the order. M2 products use `pieces`, UD and ML use `quantity`. */
export interface OrderQuoteLineDTO {
  productId: string;
  pieces?: Array<{ width: number; height: number; quantity: number }>;
  quantity?: number;
}

export interface OrderQuoteRequestDTO {
  lines: OrderQuoteLineDTO[];
}

export interface OrderQuoteProductDTO {
  id: string;
  sku: string;
  name: string;
  unit: 'UD' | 'M2' | 'ML';
  familyCode: string;
  familyName: string;
  thickness: number | null; // mm
  boardWidth: number | null; // cm, M2 only
  boardHeight: number | null; // cm, M2 only
  lengthCm: number | null; // cm, ML only
}

export interface OrderQuoteBoardGroupDTO {
  kind: 'BOARD';
  product: OrderQuoteProductDTO;
  pieces: Array<{ width: number; height: number; quantity: number }>;
  pieceCount: number;
  usedAreaM2: number;
  boardAreaM2: number;
  boardsNeeded: number; // informational: ceil(used / board), minimum 1; not billed
  pricePerM2: number; // €
  pricePerBoard: number; // € informational: price of one full board
  price: number; // € = usedAreaM2 x pricePerM2, rounded once
}

export interface OrderQuoteUnitGroupDTO {
  kind: 'UNIT';
  product: OrderQuoteProductDTO;
  quantity: number;
  unitPrice: number; // €
  price: number; // €
}

export interface OrderQuoteLinearGroupDTO {
  kind: 'LINEAR';
  product: OrderQuoteProductDTO;
  quantity: number; // bars
  lengthM: number; // per bar
  pricePerMeter: number; // €
  price: number; // €
}

export type OrderQuoteGroupDTO =
  OrderQuoteBoardGroupDTO | OrderQuoteUnitGroupDTO | OrderQuoteLinearGroupDTO;

export interface OrderQuoteResponseDTO {
  /** One group per product, ordered by first appearance in the request. */
  groups: OrderQuoteGroupDTO[];
  total: number; // € = sum of the group prices in cents
  currency: string;
  calculatedAt: string; // ISO 8601
}
