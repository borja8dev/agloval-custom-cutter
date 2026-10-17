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
    test('prices pieces with quantities by whole boards', async () => {
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

      // 20 x 0.2 m2 + 0.15 m2 = 4.15 m2 -> 5 whole boards x 10 EUR = 50
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
        price: 50,
      });
      expect(result.total).toBe(50);
      expect(result.currency).toBe('EUR');
      expect(new Date(result.calculatedAt).toISOString()).toBe(result.calculatedAt);
    });

    test('exactly one board of area bills 1 board, just over bills 2', async () => {
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
      expect(group(over.groups, 0)).toMatchObject({ boardsNeeded: 2, price: 20 }); // 1.003 m2 -> 2 boards
    });

    test('supports a large piece quantity without expanding pieces', async () => {
      const result = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 10, height: 100, quantity: 10000 }] }],
      });
      // 10000 x 0.1 m2 = 1000 m2 -> 1000 boards of 10 EUR
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
        price: 10,
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

    test('legacy rows bill whole boards at pricePerUnit too', async () => {
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
      // 1.5 m2 needs 2 legacy boards of 99 EUR = 198
      expect(group(result.groups, 0)).toMatchObject({ boardsNeeded: 2, price: 198 });
    });

    test('keeps the board count as ceil(used / board) with a minimum of 1', async () => {
      const result = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 2, height: 15, quantity: 1 }] }],
      });
      expect(group(result.groups, 0)).toMatchObject({
        usedAreaM2: 0.003,
        boardsNeeded: 1,
        price: 10,
      });
    });

    test('the price is the same whether the area needs 3.1 or 3.9 boards', async () => {
      // 1 m2 boards at 10 EUR/m2: both 3.1 m2 and 3.9 m2 need 4 boards
      const low = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 31, height: 100, quantity: 10 }] }],
      });
      const high = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 39, height: 100, quantity: 10 }] }],
      });
      expect(group(low.groups, 0)).toMatchObject({ boardsNeeded: 4, price: 40 });
      expect(group(high.groups, 0)).toMatchObject({ boardsNeeded: 4, price: 40 });
    });

    test('multiplies the cent-rounded board price by the count', async () => {
      // 1 m2 board at 12.34 EUR/m2 -> 12.34 per board; 16.00 m2 -> 16 boards = 197.44
      repo.findByIds = jest.fn().mockResolvedValue([{ ...board, pricePerM2: 12.34 }]);
      const sixteen = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 80, height: 100, quantity: 20 }] }],
      });
      expect(group(sixteen.groups, 0)).toMatchObject({
        usedAreaM2: 16,
        boardsNeeded: 16,
        pricePerBoard: 12.34,
        price: 197.44,
      });

      // 3.66 m2 boards at 12.34 EUR/m2 -> 45.16 per board (not 45.1644), 2 boards = 90.32
      repo.findByIds = jest
        .fn()
        .mockResolvedValue([
          { ...board, standardWidth: 183, standardHeight: 200, pricePerM2: 12.34 },
        ]);
      const awkward = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 183, height: 200, quantity: 2 }] }],
      });
      expect(group(awkward.groups, 0)).toMatchObject({
        boardAreaM2: 3.66,
        boardsNeeded: 2,
        pricePerBoard: 45.16,
        price: 90.32,
      });
    });

    test('exposes the whole-board price rounded to cents', async () => {
      repo.findByIds = jest.fn().mockResolvedValue([{ ...board, pricePerM2: 14.36 }]);
      const result = await service.quote({
        lines: [{ productId: 'board', pieces: [{ width: 50, height: 50, quantity: 1 }] }],
      });
      expect(group(result.groups, 0)).toMatchObject({
        pricePerM2: 14.36,
        pricePerBoard: 14.36,
        price: 14.36,
      });
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
        { ...otherBoard, pricePerM2: 12.35 },
      ]);
      const piece = [{ width: 33.33, height: 33.33, quantity: 1 }]; // one board each
      const result = await service.quote({
        lines: [
          { productId: 'board', pieces: piece },
          { productId: 'board2', pieces: piece },
        ],
      });
      expect(result.groups.map((g) => g.price)).toEqual([12.34, 12.35]);
      expect(result.total).toBe(24.69);
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
