/**
 * Output ports (Hexagonal pattern): contracts the application layer
 * depends on, implemented by infrastructure (Prisma repositories, Phase B.2).
 *
 * NOTE: Prisma's Decimal fields (pricePerUnit, pricePerBoard, totalPrice,
 * totalAreaNeeded, boardsUsed) deserialize as Prisma.Decimal objects at
 * runtime, not plain numbers. The Phase B.2 Prisma implementations of
 * these ports must call .toNumber() before returning, to actually satisfy
 * the types below.
 */

export type ProductUnit = 'UD' | 'M2' | 'ML';

export interface ProductRecord {
  id: string;
  name: string;
  sku: string;
  unit: ProductUnit;
  familyCode: string;
  familyName: string;
  categoryName: string; // alias of familyName
  standardWidth: number | null; // cm (M2 only)
  standardHeight: number | null; // cm (M2 only)
  thickness: number | null; // mm
  lengthCm: number | null; // cm (ML only)
  pricePerUnit: number; // € (board for M2, unit for UD, per metre for ML)
  pricePerM2: number | null; // € (M2 only)
  currency: string;
}

/** Optional narrowing for product listings and searches. */
export interface ProductFilter {
  /** Family code (Category.code). An unknown code simply matches nothing. */
  familyCode?: string;
  unit?: ProductUnit;
}

/** A product family with how many of its products are sold per unit. */
export interface FamilySummary {
  code: string;
  name: string;
  productCount: number;
  units: Record<ProductUnit, number>;
}

export interface CalculationRecord {
  id: string;
  productId: string;
  requestedPieces: Array<{ width: number; height: number }>;
  totalAreaNeeded: number; // m²
  boardsUsed: number;
  pricePerBoard: number; // €
  totalPrice: number; // €
  status: 'DRAFT' | 'SUBMITTED' | 'COMPLETED';
  userId?: string | null;
  createdAt: Date;
  expiresAt?: Date | null;
  product: {
    id: string;
    name: string;
    standardWidth: number;
    standardHeight: number;
    thickness: number | null;
    pricePerUnit: number; // € per board (legacy pricing)
    pricePerM2: number | null; // € per m² (M2 products)
    category: {
      name: string;
    };
  };
}

export interface IProductRepository {
  findById(productId: string): Promise<ProductRecord | null>;
  /** Existing products among the ids, one each, in no particular order. Unknown ids are skipped. */
  findByIds(productIds: string[]): Promise<ProductRecord[]>;
  findAll(limit?: number, skip?: number, filter?: ProductFilter): Promise<ProductRecord[]>;
  findByCategory(categoryId: string, limit?: number, skip?: number): Promise<ProductRecord[]>;
  search(
    query: string,
    limit?: number,
    skip?: number,
    filter?: ProductFilter
  ): Promise<ProductRecord[]>;
  /** Number of products matching the filter (not just one page). */
  count(filter?: ProductFilter): Promise<number>;
  /** Number of products matching the search query and filter (not just one page). */
  countSearch(query: string, filter?: ProductFilter): Promise<number>;
  /** Every family sorted by code, with per-unit product counts. */
  listFamilies(): Promise<FamilySummary[]>;
}

export interface ICalculationRepository {
  save(calculation: Partial<CalculationRecord>): Promise<CalculationRecord>;
  findById(id: string): Promise<CalculationRecord | null>;
  findByUserId(userId: string, limit: number, skip?: number): Promise<CalculationRecord[]>;
  update(id: string, data: Partial<CalculationRecord>): Promise<CalculationRecord>;
  delete(id: string): Promise<void>;
}
