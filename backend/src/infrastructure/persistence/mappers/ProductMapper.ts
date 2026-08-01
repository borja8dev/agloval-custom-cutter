import { Prisma } from '@prisma/client';
import { ProductRecord } from '../../../application/ports/out/CalculationPersistence';

type ProductWithCategory = Prisma.ProductGetPayload<{ include: { category: true } }>;

export class ProductMapper {
  static toDomain(product: ProductWithCategory): ProductRecord {
    return {
      id: product.id,
      name: product.name,
      categoryName: product.category.name,
      standardWidth: product.standardWidth,
      standardHeight: product.standardHeight,
      thickness: product.thickness,
      pricePerUnit: Number(product.pricePerUnit), // Decimal -> number
      currency: product.currency,
    };
  }

  static toDomainArray(products: ProductWithCategory[]): ProductRecord[] {
    return products.map((p) => this.toDomain(p));
  }

  /** Sanity check for data coming from an external/real DB during migration. */
  static validate(record: ProductRecord): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!record.id) errors.push('Product ID is required');
    if (!record.name) errors.push('Product name is required');
    if (record.standardWidth <= 0) errors.push('Standard width must be positive');
    if (record.standardHeight <= 0) errors.push('Standard height must be positive');
    if (record.pricePerUnit < 0) errors.push('Price cannot be negative');

    return { valid: errors.length === 0, errors };
  }
}
