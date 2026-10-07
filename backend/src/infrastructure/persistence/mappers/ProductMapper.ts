import { Prisma } from '@prisma/client';
import { ProductRecord, ProductUnit } from '../../../application/ports/out/CalculationPersistence';

type ProductWithCategory = Prisma.ProductGetPayload<{ include: { category: true } }>;

const VALID_UNITS: ProductUnit[] = ['UD', 'M2', 'ML'];

export class ProductMapper {
  static toDomain(product: ProductWithCategory): ProductRecord {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit as ProductUnit,
      familyCode: product.category.code,
      familyName: product.category.name,
      categoryName: product.category.name,
      standardWidth: product.standardWidth,
      standardHeight: product.standardHeight,
      thickness: product.thickness,
      lengthCm: product.lengthCm,
      pricePerUnit: Number(product.pricePerUnit), // Decimal -> number
      pricePerM2: product.pricePerM2 === null ? null : Number(product.pricePerM2),
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
    if (!VALID_UNITS.includes(record.unit)) {
      errors.push('Unit must be one of UD, M2, ML');
    }
    if (record.unit === 'M2') {
      if (!record.standardWidth || record.standardWidth <= 0) {
        errors.push('Standard width must be positive');
      }
      if (!record.standardHeight || record.standardHeight <= 0) {
        errors.push('Standard height must be positive');
      }
    }
    if (record.unit === 'ML' && (!record.lengthCm || record.lengthCm <= 0)) {
      errors.push('Length must be positive');
    }
    if (record.pricePerUnit < 0) errors.push('Price cannot be negative');

    return { valid: errors.length === 0, errors };
  }
}
