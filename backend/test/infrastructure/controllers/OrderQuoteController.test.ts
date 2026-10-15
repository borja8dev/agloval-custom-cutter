import request from 'supertest';
import { Express } from 'express';
import { createExpressApp } from '../../../src/infrastructure/config/express';
import { ICalculateUseCase } from '../../../src/application/ports/in/CalculateUseCase';
import { IProductUseCase } from '../../../src/application/ports/in/ProductUseCase';
import { IOrderQuoteUseCase } from '../../../src/application/ports/in/OrderQuoteUseCase';
import { OrderQuoteResponseDTO } from '../../../src/application/dto/OrderQuote';
import {
  InvalidOrderLineException,
  ProductNotFoundException,
} from '../../../src/application/exceptions/ApplicationException';

const ID_BOARD = 'clv9t1a2k0001zzz9qqqqqqqq';
const ID_UNIT = 'clv9t1a2k0002zzz9qqqqqqqq';
const ID_BAR = 'clv9t1a2k0003zzz9qqqqqqqq';

const baseProduct = {
  sku: 'SKU',
  familyCode: 'MEL',
  familyName: 'Melamina',
  thickness: null,
  boardWidth: null,
  boardHeight: null,
  lengthCm: null,
};

const mixedResponse: OrderQuoteResponseDTO = {
  groups: [
    {
      kind: 'BOARD',
      product: {
        ...baseProduct,
        id: ID_BOARD,
        name: 'Board',
        unit: 'M2',
        thickness: 16,
        boardWidth: 244,
        boardHeight: 122,
      },
      pieces: [{ width: 100, height: 80, quantity: 20 }],
      pieceCount: 20,
      usedAreaM2: 16,
      boardAreaM2: 2.9768,
      boardsNeeded: 6,
      pricePerM2: 15.5,
      pricePerBoard: 46.14,
      price: 248,
    },
    {
      kind: 'UNIT',
      product: { ...baseProduct, id: ID_UNIT, name: 'Screw', unit: 'UD' },
      quantity: 12,
      unitPrice: 0.35,
      price: 4.2,
    },
    {
      kind: 'LINEAR',
      product: { ...baseProduct, id: ID_BAR, name: 'Bar', unit: 'ML', lengthCm: 240 },
      quantity: 3,
      lengthM: 2.4,
      pricePerMeter: 5,
      price: 36,
    },
  ],
  total: 288.2,
  currency: 'EUR',
  calculatedAt: '2026-10-09T10:00:00.000Z',
};

describe('OrderQuoteController - Integration', () => {
  let app: Express;
  let orderQuoteUseCase: IOrderQuoteUseCase;

  beforeEach(() => {
    orderQuoteUseCase = { quote: jest.fn().mockResolvedValue(mixedResponse) };
    app = createExpressApp({} as ICalculateUseCase, {} as IProductUseCase, orderQuoteUseCase);
  });

  const mixedBody = {
    lines: [
      { productId: ID_BOARD, pieces: [{ width: 100, height: 80, quantity: 20 }] },
      { productId: ID_UNIT, quantity: 12 },
      { productId: ID_BAR, quantity: 3 },
    ],
  };

  test('prices a mixed order and returns 200 in the ApiResponse envelope', async () => {
    const response = await request(app).post('/api/orders/quote').send(mixedBody).expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mixedResponse);
    expect(orderQuoteUseCase.quote).toHaveBeenCalledWith(mixedBody);
  });

  test('passes the defaulted piece quantity to the use case', async () => {
    await request(app)
      .post('/api/orders/quote')
      .send({ lines: [{ productId: ID_BOARD, pieces: [{ width: 50, height: 30 }] }] })
      .expect(200);

    expect(orderQuoteUseCase.quote).toHaveBeenCalledWith({
      lines: [{ productId: ID_BOARD, pieces: [{ width: 50, height: 30, quantity: 1 }] }],
    });
  });

  test('returns 400 VALIDATION_ERROR for an empty order without calling the use case', async () => {
    const response = await request(app).post('/api/orders/quote').send({ lines: [] }).expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(orderQuoteUseCase.quote).not.toHaveBeenCalled();
  });

  test('returns 404 when the use case reports an unknown product', async () => {
    (orderQuoteUseCase.quote as jest.Mock).mockRejectedValue(new ProductNotFoundException(ID_UNIT));

    const response = await request(app).post('/api/orders/quote').send(mixedBody).expect(404);
    expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  test('returns 400 when the use case reports a unit mismatch', async () => {
    (orderQuoteUseCase.quote as jest.Mock).mockRejectedValue(
      new InvalidOrderLineException('Screw', 'UD', 'needs a quantity')
    );

    const response = await request(app).post('/api/orders/quote').send(mixedBody).expect(400);
    expect(response.body.error.code).toBe('INVALID_ORDER_LINE');
    expect(response.body.error.message).toContain('Screw');
  });
});
