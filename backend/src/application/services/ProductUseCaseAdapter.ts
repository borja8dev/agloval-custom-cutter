import { IProductUseCase } from '../ports/in/ProductUseCase';
import {
  FamilySummary,
  IProductRepository,
  ProductFilter,
  ProductRecord,
} from '../ports/out/CalculationPersistence';

/**
 * Thin pass-through implementing IProductUseCase over IProductRepository.
 * Not a test double — this is real production wiring (server.ts). A real
 * ProductApplicationService (mirroring CalculationApplicationService) can
 * replace this once the product catalog needs actual orchestration logic
 * beyond "ask the repository."
 */
export class ProductUseCaseAdapter implements IProductUseCase {
  constructor(private productRepository: IProductRepository) {}

  async getAll(limit?: number, skip?: number, filter?: ProductFilter): Promise<ProductRecord[]> {
    return this.productRepository.findAll(limit, skip, filter);
  }

  async getById(productId: string): Promise<ProductRecord | null> {
    return this.productRepository.findById(productId);
  }

  async search(
    query: string,
    limit?: number,
    skip?: number,
    filter?: ProductFilter
  ): Promise<ProductRecord[]> {
    return this.productRepository.search(query, limit, skip, filter);
  }

  async countAll(filter?: ProductFilter): Promise<number> {
    return this.productRepository.count(filter);
  }

  async countSearch(query: string, filter?: ProductFilter): Promise<number> {
    return this.productRepository.countSearch(query, filter);
  }

  async listFamilies(): Promise<FamilySummary[]> {
    return this.productRepository.listFamilies();
  }
}
