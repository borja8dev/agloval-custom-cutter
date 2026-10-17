import { QuoteOrderService } from '../../../src/application/services/QuoteOrderService';
import {
  IProductRepository,
  ProductRecord,
} from '../../../src/application/ports/out/CalculationPersistence';
import {
  InvalidOrderLineException,
  ProductNotFoundException,
  IncompleteProductException,
} from '../../../src/application/exceptions/ApplicationException';
import { InvalidPieceException } from '../../../src/domain/exceptions/DomainException';
import { OrderQuoteGroupDTO } from '../../../src/application/dto/OrderQuote';

// Board 100 x 100 cm = 1 m2 keeps the area arithmetic readable.
const board: ProductRecord = {
  id: 'board',
  name: 'Melamina 100x100',
  sku: 'MEL-1',
  unit: 'M2',
  familyCode: 'MEL',
  familyName: 'Melamina',
  categoryName: 'Melamina',
  standardWidth: 100,
  standardHeight: 100,
  thickness: 16,
  lengthCm: null,
  pricePerUnit: 99,
  pricePerM2: 10,
  currency: 'EUR',
};

const otherBoard: ProductRecord = {
  ...board,
  id: 'board2',
  sku: 'MEL-2',
  name: 'Other',
  pricePerM2: 20,
};

const screw: ProductRecord = {
  ...board,
  id: 'screw',
  name: 'Tornillo',
  sku: 'UD-1',
  unit: 'UD',
  familyCode: 'FER',
  familyName: 'Ferreteria',
  categoryName: 'Ferreteria',
  standardWidth: null,
  standardHeight: null,
  thickness: null,
  pricePerUnit: 0.35,
  pricePerM2: null,
};

const bar: ProductRecord = {
  ...screw,
  id: 'bar',
  name: 'Barra 2.4',
  sku: 'ML-1',
  unit: 'ML',
  lengthCm: 240,
  pricePerUnit: 1.37, // per metre
};

describe('QuoteOrderService', () => {
  let repo: IProductRepository;
  let service: QuoteOrderService;
  const catalog = [board, otherBoard, screw, bar];

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findByIds: jest
        .fn()
        .mockImplementation((ids: string[]) =>
          Promise.resolve(catalog.filter((p) => ids.includes(p.id)))
        ),
      findAll: jest.fn(),
      findByCategory: jest.fn(),
      search: jest.fn(),
      count: jest.fn(),
      countSearch: jest.fn(),
      listFamilies: jest.fn(),
    };
    service = new QuoteOrderService(repo);
  });

  const group = (groups: OrderQuoteGroupDTO[], index: number): OrderQuoteGroupDTO => {
    const g = groups[index];
    if (!g) throw new Error(`no group at ${index}`);
    return g;
  };

  describe('board groups', () => {
    test('prices pieces with quantities by the used area', async () => {
      const result = await service.quote({
        lines: [
          {
            productId: 'board',
            pieces: [
              { width: 50, height: 40, quantity: 20 },
              { width: 50, height: 30, quantity: 1 },
            ],
          },
        ],
      });

      // 20 x 0.2 m2 + 0.15 m2 = 4.15 m2 at 10 EUR/m2 = 41.50; 5 boards are only informational
      expect(group(result.groups, 0)).toEqual({
        kind: 'BOARD',
        product: {
          id: 'board',
          sku: 'MEL-1',
          name: 'Melamina 100x100',
          unit: 'M2',
          familyCode: 'MEL',
          familyName: 'Melamina',
          thickness: 16,
          boardWidth: 100,
          boardHeight: 100,
          lengthCm: null,
        },
        pieces: [
          { width: 50, height: 40, quantity: 20 },
          { width: 50, height: 30, quantity: 1 },
        ],
        pieceCount: 21,
        usedAreaM2: 4.15,
        boardAreaM2: 1,
        boardsNeeded: 5,
        pricePerM2: 10,
        pricePerBoard: 10,
        price: 41.5,
      });
      expect(result.total).toBe(41.5);
      expect(result.currency).toBe('EUR');
      expect(new Date(result.calculatedAt).toISOString()).toBe(result.calculatedAt);
    });

    test('exactly one board of area needs 1 board, just over needs 2, and the price follows the area', async () => {
      const exact = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 100, height: 100, quantity: 1 }] }],
      });
      expect(group(exact.groups, 0)).toMatchObject({ boardsNeeded: 1, price: 10 });

      const over = await service.quote({
        lines: [
          {
            productId: 'board',
            pieces: [
              { width: 100, height: 100, quantity: 1 },
              { width: 2, height: 15, quantity: 1 },
            ],
          },
        ],
      });
      expect(group(over.groups, 0)).toMatchObject({ boardsNeeded: 2, price: 10.03 }); // 1.003 m2, not 2 boards
    });

    test('supports a large piece quantity without expanding pieces', async () => {
      const result = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 10, height: 100, quantity: 10000 }] }],
      });
      // 10000 x 0.1 m2 = 1000 m2 -> 1000 boards
      expect(group(result.groups, 0)).toMatchObject({
        pieceCount: 10000,
        boardsNeeded: 1000,
        price: 10000,
      });
    });

    test('merges several lines of the same board so they share boards', async () => {
      const result = await service.quote({
        lines: [
          { productId: 'board', pieces: [{ width: 60, height: 100, quantity: 1 }] },
          { productId: 'screw', quantity: 1 },
          { productId: 'board', pieces: [{ width: 30, height: 100, quantity: 1 }] },
        ],
      });

      expect(result.groups).toHaveLength(2);
      // 0.6 + 0.3 = 0.9 m2 -> 1 board (separately it would have been 2)
      expect(group(result.groups, 0)).toMatchObject({
        kind: 'BOARD',
        pieceCount: 2,
        boardsNeeded: 1,
        price: 9,
        pieces: [
          { width: 60, height: 100, quantity: 1 },
          { width: 30, height: 100, quantity: 1 },
        ],
      });
    });

    test('derives the m2 price from pricePerUnit / board area when pricePerM2 is null', async () => {
      repo.findByIds = jest.fn().mockResolvedValue([{ ...board, pricePerM2: null }]);
      const result = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 100, height: 100, quantity: 2 }] }],
      });
      expect(group(result.groups, 0)).toMatchObject({
        boardsNeeded: 2,
        pricePerM2: 99,
        pricePerBoard: 99,
        price: 198,
      });
    });

    test('legacy rows bill the used area too, not whole boards', async () => {
      repo.findByIds = jest.fn().mockResolvedValue([{ ...board, pricePerM2: null }]);
      const result = await service.quote({
        lines: [
          {
            productId: 'board',
            pieces: [
              { width: 100, height: 100, quantity: 1 },
              { width: 100, height: 50, quantity: 1 },
            ],
          },
        ],
      });
      // 1.5 m2 of a 99 EUR/m2 legacy board = 148.50, on 2 boards
      expect(group(result.groups, 0)).toMatchObject({ boardsNeeded: 2, price: 148.5 });
    });

    test('keeps the board count as ceil(used / board) with a minimum of 1', async () => {
      const result = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 2, height: 15, quantity: 1 }] }],
      });
      expect(group(result.groups, 0)).toMatchObject({
        usedAreaM2: 0.003,
        boardsNeeded: 1,
        price: 0.03,
      });
    });

    test('the price is the same whether the area needs 1 or 2 boards', async () => {
      // 1 m2 boards at 10 EUR/m2: 0.9 m2 fits 1 board, 1.1 m2 needs 2
      const one = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 90, height: 100, quantity: 1 }] }],
      });
      const two = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 110 / 2, height: 100, quantity: 2 }] }],
      });
      expect(group(one.groups, 0)).toMatchObject({ boardsNeeded: 1, price: 9 });
      expect(group(two.groups, 0)).toMatchObject({ boardsNeeded: 2, price: 11 });
    });

    test('prices an area with awkward decimals exactly and rounds once', async () => {
      repo.findByIds = jest.fn().mockResolvedValue([{ ...board, pricePerM2: 14.36 }]);
      const exact = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 80, height: 100, quantity: 20 }] }],
      });
      // 16.00 m2 x 14.36 = 229.76
      expect(group(exact.groups, 0)).toMatchObject({ usedAreaM2: 16, price: 229.76 });

      repo.findByIds = jest.fn().mockResolvedValue([{ ...board, pricePerM2: 12.34 }]);
      const once = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 33.33, height: 33.33, quantity: 10 }] }],
      });
      // 1.1108889 m2 x 12.34 = 13.7084 (per piece it would round to 1.37 -> 13.70)
      expect(group(once.groups, 0)).toMatchObject({ price: 13.71 });
    });

    test('exposes the informational whole-board price rounded once', async () => {
      repo.findByIds = jest.fn().mockResolvedValue([{ ...board, pricePerM2: 14.36 }]);
      const result = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 50, height: 50, quantity: 1 }] }],
      });
      expect(group(result.groups, 0)).toMatchObject({ pricePerM2: 14.36, pricePerBoard: 14.36 });
    });

    test('rejects a piece larger than the board with a 400', async () => {
      const call = service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 101, height: 50, quantity: 1 }] }],
      });
      await expect(call).rejects.toBeInstanceOf(InvalidPieceException);
      await expect(call).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('unit and linear groups', () => {
    test('sums UD quantities across lines', async () => {
      const result = await service.quote({
        lines: [
          { productId: 'screw', quantity: 10 },
          { productId: 'screw', quantity: 2 },
        ],
      });
      expect(result.groups).toEqual([
        {
          kind: 'UNIT',
          product: expect.objectContaining({
            id: 'screw',
            unit: 'UD',
            boardWidth: null,
            lengthCm: null,
          }),
          quantity: 12,
          unitPrice: 0.35,
          price: 4.2,
        },
      ]);
    });

    test('prices ML by length in metres with one rounding per group', async () => {
      const result = await service.quote({ lines: [{ productId: 'bar', quantity: 3 }] });
      // 1.37 EUR/m x 2.4 m x 3 = 9.864 -> 9.86
      expect(result.groups).toEqual([
        {
          kind: 'LINEAR',
          product: expect.objectContaining({ id: 'bar', unit: 'ML', lengthCm: 240 }),
          quantity: 3,
          lengthM: 2.4,
          pricePerMeter: 1.37,
          price: 9.86,
        },
      ]);
    });
  });

  describe('order composition', () => {
    test('orders groups by first appearance and totals the group cents', async () => {
      const result = await service.quote({
        lines: [
          { productId: 'bar', quantity: 3 },
          { productId: 'board', pieces: [{ width: 100, height: 100, quantity: 1 }] },
          { productId: 'screw', quantity: 12 },
          { productId: 'bar', quantity: 1 },
        ],
      });

      expect(result.groups.map((g) => g.product.id)).toEqual(['bar', 'board', 'screw']);
      // bar: 4 x 2.4 m x 1.37 = 13.152 -> 13.15 ; board 10 ; screws 4.2
      expect(result.groups.map((g) => g.price)).toEqual([13.15, 10, 4.2]);
      expect(result.total).toBe(27.35);
    });

    test('total is the sum of the group cents, not a re-rounded float sum', async () => {
      const result = await service.quote({
        lines: [
          { productId: 'screw', quantity: 1 }, // 0.35
          { productId: 'bar', quantity: 1 }, // 3.288 -> 3.29
        ],
      });
      expect(result.total).toBe(3.64);
    });

    test('two board groups total the sum of their cent prices', async () => {
      repo.findByIds = jest.fn().mockResolvedValue([
        { ...board, pricePerM2: 12.34 },
        { ...otherBoard, pricePerM2: 12.34 },
      ]);
      const piece = [{ width: 33.33, height: 33.33, quantity: 1 }]; // 0.1108889 m2 -> 1.37
      const result = await service.quote({
        lines: [
          { productId: 'board', pieces: piece },
          { productId: 'board2', pieces: piece },
        ],
      });
      expect(result.groups.map((g) => g.price)).toEqual([1.37, 1.37]);
      expect(result.total).toBe(2.74);
    });

    test('loads all products with a single repository call', async () => {
      await service.quote({
        lines: [
          { productId: 'screw', quantity: 1 },
          { productId: 'screw', quantity: 1 },
          { productId: 'bar', quantity: 1 },
        ],
      });
      expect(repo.findByIds).toHaveBeenCalledTimes(1);
      expect(repo.findByIds).toHaveBeenCalledWith(['screw', 'bar']);
      expect(repo.findById).not.toHaveBeenCalled();
    });
  });

  describe('errors', () => {
    test('reports the first unknown product as not found', async () => {
      await expect(
        service.quote({
          lines: [
            { productId: 'screw', quantity: 1 },
            { productId: 'ghost', quantity: 1 },
          ],
        })
      ).rejects.toBeInstanceOf(ProductNotFoundException);
    });

    test('rejects pieces on a UD product, naming product and unit', async () => {
      const call = service.quote({
        lines: [{ productId: 'screw', pieces: [{ width: 50, height: 50, quantity: 1 }] }],
      });
      await expect(call).rejects.toBeInstanceOf(InvalidOrderLineException);
      await expect(call).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_ORDER_LINE' });
      await expect(call).rejects.toThrow(/Tornillo.*UD.*quantity/);
    });

    test('rejects pieces on an ML product', async () => {
      await expect(
        service.quote({
          lines: [{ productId: 'bar', pieces: [{ width: 50, height: 50, quantity: 1 }] }],
        })
      ).rejects.toThrow(/Barra 2\.4.*ML/);
    });

    test('rejects a quantity on an M2 product, naming product and unit', async () => {
      const call = service.quote({ lines: [{ productId: 'board', quantity: 3 }] });
      await expect(call).rejects.toBeInstanceOf(InvalidOrderLineException);
      await expect(call).rejects.toThrow(/Melamina 100x100.*M2.*pieces/);
    });

    test('flags an M2 product without board dimensions as incomplete data', async () => {
      repo.findByIds = jest.fn().mockResolvedValue([{ ...board, standardWidth: null }]);
      const call = service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 50, height: 50, quantity: 1 }] }],
      });
      await expect(call).rejects.toBeInstanceOf(IncompleteProductException);
      await expect(call).rejects.toMatchObject({ statusCode: 500 });
    });

    test('flags an ML product without length as incomplete data', async () => {
      repo.findByIds = jest.fn().mockResolvedValue([{ ...bar, lengthCm: null }]);
      await expect(
        service.quote({ lines: [{ productId: 'bar', quantity: 1 }] })
      ).rejects.toBeInstanceOf(IncompleteProductException);
    });
  });
});
