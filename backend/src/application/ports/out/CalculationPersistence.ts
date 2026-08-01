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

export interface ProductRecord {
  id: string;
  name: string;
  categoryName: string;
  standardWidth: number; // cm
  standardHeight: number; // cm
  thickness: number; // mm
  pricePerUnit: number; // €
  currency: string;
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
  createdAt: Date;
  expiresAt?: Date | null;
  product: {
    id: string;
    name: string;
    standardWidth: number;
    standardHeight: number;
    thickness: number;
    category: {
      name: string;
    };
  };
}

export interface IProductRepository {
  findById(productId: string): Promise<ProductRecord | null>;
  findAll(limit?: number): Promise<ProductRecord[]>;
  findByCategory(categoryId: string): Promise<ProductRecord[]>;
}

export interface ICalculationRepository {
  save(calculation: Partial<CalculationRecord>): Promise<CalculationRecord>;
  findById(id: string): Promise<CalculationRecord | null>;
  findByUserId(userId: string, limit: number): Promise<CalculationRecord[]>;
  update(id: string, data: Partial<CalculationRecord>): Promise<CalculationRecord>;
  delete(id: string): Promise<void>;
}
