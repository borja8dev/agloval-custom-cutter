import { Prisma } from '@prisma/client';
import { CalculationMapper } from '../../../../src/infrastructure/persistence/mappers/CalculationMapper';
import { MissingBoardDimensionsException } from '../../../../src/application/exceptions/ApplicationException';

type Row = Parameters<typeof CalculationMapper.toDomain>[0];

const buildRow = (productOverrides: Record<string, unknown> = {}): Row =>
  ({
    id: 'calc_1',
    productId: 'prod_1',
    requestedPieces: [{ width: 100, height: 100 }],
    totalAreaNeeded: new Prisma.Decimal('1'),
    boardsUsed: new Prisma.Decimal('1'),
    pricePerBoard: new Prisma.Decimal('60'),
    totalPrice: new Prisma.Decimal('60'),
    status: 'DRAFT',
    userId: null,
    createdAt: new Date(),
    expiresAt: null,
    product: {
      id: 'prod_1',
      name: 'Board',
      standardWidth: 300,
      standardHeight: 200,
      thickness: 18,
      pricePerUnit: new Prisma.Decimal('100'),
      pricePerM2: new Prisma.Decimal('10'),
      category: { name: 'Family' },
      ...productOverrides,
    },
  }) as unknown as Row;

describe('CalculationMapper.toDomain', () => {
  test('maps the product prices to numbers', () => {
    const record = CalculationMapper.toDomain(buildRow());
    expect(record.product.pricePerUnit).toBe(100);
    expect(record.product.pricePerM2).toBe(10);
  });

  test('keeps a null pricePerM2 and a null thickness as null', () => {
    const record = CalculationMapper.toDomain(buildRow({ pricePerM2: null, thickness: null }));
    expect(record.product.pricePerM2).toBeNull();
    expect(record.product.thickness).toBeNull();
  });

  test.each([
    ['width', { standardWidth: null }],
    ['height', { standardHeight: null }],
  ])('throws a typed error when the product has no board %s', (_label, override) => {
    const act = () => CalculationMapper.toDomain(buildRow(override));
    expect(act).toThrow(MissingBoardDimensionsException);
    expect(act).toThrow(/calc_1/);
  });

  test('the typed error carries a stable code', () => {
    try {
      CalculationMapper.toDomain(buildRow({ standardWidth: null }));
      throw new Error('expected to throw');
    } catch (error) {
      expect((error as MissingBoardDimensionsException).code).toBe('MISSING_BOARD_DIMENSIONS');
    }
  });
});
