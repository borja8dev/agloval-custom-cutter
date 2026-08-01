import { ProductRecord } from '../out/CalculationPersistence';

/**
 * Input port (Hexagonal pattern) for the product catalog. Kept alongside
 * ICalculateUseCase in ports/in — the real application-layer implementation
 * (backed by Prisma) lands in a later phase; for now it's satisfied by a
 * stub in server.ts.
 */
export interface IProductUseCase {
  getAll(limit?: number): Promise<ProductRecord[]>;
  getById(productId: string): Promise<ProductRecord | null>;
  search(query: string): Promise<ProductRecord[]>;
}
