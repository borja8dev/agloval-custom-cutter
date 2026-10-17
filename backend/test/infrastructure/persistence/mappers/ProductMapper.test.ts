import { Prisma } from '@prisma/client';
import { ProductMapper } from '../../../../src/infrastructure/persistence/mappers/ProductMapper';
import { ProductRecord } from '../../../../src/application/ports/out/CalculationPersistence';

describe('ProductMapper.validate()', () => {
  const validRecord: ProductRecord = {
    id: 'prod_1',
    name: 'Melamina Blanca 300x200',
    sku: 'MEL-300',
    unit: 'M2',
    familyCode: 'MEL',
    familyName: 'Melamina',
    categoryName: 'Melamina',
    standardWidth: 300,
    standardHeight: 200,
    thickness: 18,
    lengthCm: null,
    pricePerUnit: 95.5,
    pricePerM2: 15.9,
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

describe('ProductMapper.validate() per unit', () => {
  const base: ProductRecord = {
    id: 'p',
    name: 'Item',
    sku: 'SKU-1',
    unit: 'UD',
    familyCode: 'F',
    familyName: 'Family',
    categoryName: 'Family',
    standardWidth: null,
    standardHeight: null,
    thickness: null,
    lengthCm: null,
    pricePerUnit: 5,
    pricePerM2: null,
    currency: 'EUR',
  };

  test('accepts a UD product without dimensions', () => {
    expect(ProductMapper.validate(base)).toEqual({ valid: true, errors: [] });
  });

  test('rejects an M2 product without dimensions', () => {
    const result = ProductMapper.validate({ ...base, unit: 'M2' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Standard width must be positive');
    expect(result.errors).toContain('Standard height must be positive');
  });

  test('rejects an ML product without lengthCm', () => {
    const result = ProductMapper.validate({ ...base, unit: 'ML' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Length must be positive');
  });

  test('accepts an ML product with lengthCm', () => {
    expect(ProductMapper.validate({ ...base, unit: 'ML', lengthCm: 270 }).valid).toBe(true);
  });

  test('rejects an unknown unit', () => {
    const result = ProductMapper.validate({ ...base, unit: 'KG' as never });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Unit must be one of UD, M2, ML');
  });
});

describe('ProductMapper.toDomain()', () => {
  const now = new Date();
  const row = {
    id: 'p1',
    name: 'Cable',
    description: null,
    categoryId: 'c1',
    sku: 'ML-1',
    unit: 'ML',
    lengthCm: 270,
    standardWidth: null,
    standardHeight: null,
    thickness: null,
    minWidth: null,
    minHeight: null,
    maxWidth: null,
    maxHeight: null,
    pricePerUnit: new Prisma.Decimal('3.50'),
    pricePerM2: new Prisma.Decimal('12.25'),
    currency: 'EUR',
    createdAt: now,
    updatedAt: now,
    category: { id: 'c1', name: 'Perfiles', code: 'PER' },
  };

  test('maps sku, unit, family, pricePerM2 and lengthCm', () => {
    const record = ProductMapper.toDomain(row);
    expect(record).toMatchObject({
      sku: 'ML-1',
      unit: 'ML',
      familyCode: 'PER',
      familyName: 'Perfiles',
      categoryName: 'Perfiles',
      lengthCm: 270,
      standardWidth: null,
      standardHeight: null,
      thickness: null,
      pricePerUnit: 3.5,
      pricePerM2: 12.25,
    });
  });

  test('maps a null pricePerM2 to null', () => {
    expect(ProductMapper.toDomain({ ...row, pricePerM2: null }).pricePerM2).toBeNull();
  });
});
