import { FamilySummary, ProductFilter, ProductRecord } from '../out/CalculationPersistence';

/**
 * Input port (Hexagonal pattern) for the product catalog. Kept alongside
 * ICalculateUseCase in ports/in. Implemented by ProductUseCaseAdapter — a
 * thin pass-through over IProductRepository, not a full application
 * service (no orchestration logic beyond "ask the repository" exists yet).
 */
export interface IProductUseCase {
  getAll(limit?: number, skip?: number, filter?: ProductFilter): Promise<ProductRecord[]>;
  getById(productId: string): Promise<ProductRecord | null>;
  search(
    query: string,
    limit?: number,
    skip?: number,
    filter?: ProductFilter
  ): Promise<ProductRecord[]>;
  /** Total products matching the filter, ignoring pagination. */
  countAll(filter?: ProductFilter): Promise<number>;
  /** Total products matching the query and filter, ignoring pagination. */
  countSearch(query: string, filter?: ProductFilter): Promise<number>;
  listFamilies(): Promise<FamilySummary[]>;
}
