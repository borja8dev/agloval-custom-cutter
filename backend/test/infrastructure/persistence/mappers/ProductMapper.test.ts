import { ProductMapper } from '../../../../src/infrastructure/persistence/mappers/ProductMapper';
import { ProductRecord } from '../../../../src/application/ports/out/CalculationPersistence';

describe('ProductMapper.validate()', () => {
  const validRecord: ProductRecord = {
    id: 'prod_1',
    name: 'Melamina Blanca 300x200',
    categoryName: 'Melamina',
    standardWidth: 300,
    standardHeight: 200,
    thickness: 18,
    pricePerUnit: 95.5,
    currency: 'EUR',
  };

  test('accepts a fully valid record', () => {
    expect(ProductMapper.validate(validRecord)).toEqual({ valid: true, errors: [] });
  });

  test('flags a missing id', () => {
    const result = ProductMapper.validate({ ...validRecord, id: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Product ID is required');
  });

  test('flags a missing name', () => {
    const result = ProductMapper.validate({ ...validRecord, name: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Product name is required');
  });

  test('flags non-positive standardWidth', () => {
    const result = ProductMapper.validate({ ...validRecord, standardWidth: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Standard width must be positive');
  });

  test('flags non-positive standardHeight', () => {
    const result = ProductMapper.validate({ ...validRecord, standardHeight: -10 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Standard height must be positive');
  });

  test('flags a negative price', () => {
    const result = ProductMapper.validate({ ...validRecord, pricePerUnit: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Price cannot be negative');
  });

  test('accumulates every error at once', () => {
    const result = ProductMapper.validate({
      ...validRecord,
      id: '',
      name: '',
      standardWidth: 0,
      standardHeight: 0,
      pricePerUnit: -5,
    });
    expect(result.errors).toHaveLength(5);
  });
});
