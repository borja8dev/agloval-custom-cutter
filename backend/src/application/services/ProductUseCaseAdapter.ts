import { IProductUseCase } from '../ports/in/ProductUseCase';
import { IProductRepository, ProductRecord } from '../ports/out/CalculationPersistence';

/**
 * Thin pass-through implementing IProductUseCase over IProductRepository.
 * Not a test double — this is real production wiring (server.ts). A real
 * ProductApplicationService (mirroring CalculationApplicationService) can
 * replace this once the product catalog needs actual orchestration logic
 * beyond "ask the repository."
 */
export class ProductUseCaseAdapter implements IProductUseCase {
  constructor(private productRepository: IProductRepository) {}

  async getAll(limit?: number): Promise<ProductRecord[]> {
    return this.productRepository.findAll(limit);
  }

  async getById(productId: string): Promise<ProductRecord | null> {
    return this.productRepository.findById(productId);
  }

  async search(query: string): Promise<ProductRecord[]> {
    return this.productRepository.search(query);
  }
}
