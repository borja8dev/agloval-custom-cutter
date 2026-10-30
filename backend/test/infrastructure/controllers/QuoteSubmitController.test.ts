import request from 'supertest';
import { Express } from 'express';
import { createExpressApp } from '../../../src/infrastructure/config/express';
import { ICalculateUseCase } from '../../../src/application/ports/in/CalculateUseCase';
import { IProductUseCase } from '../../../src/application/ports/in/ProductUseCase';
import { IOrderQuoteUseCase } from '../../../src/application/ports/in/OrderQuoteUseCase';
import { IOrderSubmitUseCase } from '../../../src/application/ports/in/OrderSubmitUseCase';
import { IQuoteSubmitUseCase } from '../../../src/application/ports/in/QuoteSubmitUseCase';
import { QuoteSubmitResponseDTO } from '../../../src/application/dto/QuoteSubmit';
import { OrderSubmitResponseDTO } from '../../../src/application/dto/OrderSubmit';
import {
  EmailDeliveryException,
  ProductNotFoundException,
} from '../../../src/application/exceptions/ApplicationException';

const ID_UNIT = 'clv9t1a2k0002zzz9qqqqqqqq';

const quote: QuoteSubmitResponseDTO['quote'] = {
  groups: [
    {
      kind: 'UNIT',
      product: {
        id: ID_UNIT,
        sku: 'SKU',
        name: 'Tornillo 4x30',
        unit: 'UD',
        familyCode: 'FER',
        familyName: 'Ferretería',
        thickness: null,
        boardWidth: null,
        boardHeight: null,
        lengthCm: null,
      },
      quantity: 12,
      unitPrice: 0.35,
      price: 4.2,
    },
  ],
  total: 4.2,
  currency: 'EUR',
  calculatedAt: '2026-10-22T10:00:00.000Z',
};

const quoteResponse: QuoteSubmitResponseDTO = {
  quoteNumber: 3,
  quote,
  emails: { customer: 'sent' },
};

const orderResponse: OrderSubmitResponseDTO = {
  orderNumber: 12,
  quote,
  emails: { customer: 'sent', agloval: 'skipped' },
};

const customer = { name: 'Ana García', email: 'ana@example.com', phone: '600 123 456' };
const lines = [{ productId: ID_UNIT, quantity: 12 }];

const quoteBody = {
  quoteNumber: 3,
  customer,
  reference: 'Obra Calle Mayor',
  privacyAccepted: true,
  lines,
};
const orderBody = { orderNumber: 12, customer, privacyAccepted: true, lines };

describe('POST /api/quotes/submit', () => {
  let app: Express;
  let quoteSubmitUseCase: jest.Mocked<IQuoteSubmitUseCase>;
  let orderSubmitUseCase: jest.Mocked<IOrderSubmitUseCase>;

  const buildApp = (submitRateLimit = { max: 100, windowMs: 60_000 }) =>
    createExpressApp({
      calculationUseCase: {} as ICalculateUseCase,
      productUseCase: {} as IProductUseCase,
      orderQuoteUseCase: {} as IOrderQuoteUseCase,
      orderSubmitUseCase,
      quoteSubmitUseCase,
      submitRateLimit,
    });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    quoteSubmitUseCase = { submit: jest.fn().mockResolvedValue(quoteResponse) };
    orderSubmitUseCase = { submit: jest.fn().mockResolvedValue(orderResponse) };
    app = buildApp();
  });

  afterEach(() => jest.restoreAllMocks());

  test('submits the quote and returns 201 in the ApiResponse envelope', async () => {
    const response = await request(app).post('/api/quotes/submit').send(quoteBody).expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(quoteResponse);
    expect(quoteSubmitUseCase.submit).toHaveBeenCalledWith(quoteBody);
  });

  test('passes no reference when it is blank', async () => {
    await request(app)
      .post('/api/quotes/submit')
      .send({ ...quoteBody, reference: '   ' })
      .expect(201);

    expect(quoteSubmitUseCase.submit.mock.calls[0]?.[0].reference).toBeUndefined();
  });

  test('returns 400 with the Spanish messages and does not call the use case', async () => {
    const response = await request(app)
      .post('/api/quotes/submit')
      .send({
        ...quoteBody,
        customer: { name: '', email: 'nope', phone: '12' },
        reference: 'x'.repeat(81),
        privacyAccepted: false,
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    const fieldErrors = JSON.stringify(response.body.error.details);
    expect(fieldErrors).toContain('Introduce tu nombre');
    expect(fieldErrors).toContain('Introduce un correo válido');
    expect(fieldErrors).toContain('Introduce un teléfono válido');
    expect(fieldErrors).toContain('Debes aceptar la política de privacidad');
    expect(fieldErrors).toContain('La referencia no puede superar 80 caracteres');
    expect(quoteSubmitUseCase.submit).not.toHaveBeenCalled();
  });

  test('returns 400 for a reference with control characters', async () => {
    const response = await request(app)
      .post('/api/quotes/submit')
      .send({ ...quoteBody, reference: 'a\u0007b' })
      .expect(400);

    expect(JSON.stringify(response.body.error.details)).toContain(
      'La referencia contiene caracteres no válidos'
    );
  });

  test('shares one per-IP limit with POST /api/orders/submit', async () => {
    app = buildApp({ max: 2, windowMs: 60_000 });

    await request(app).post('/api/quotes/submit').send(quoteBody).expect(201);
    await request(app).post('/api/orders/submit').send(orderBody).expect(201);
    const quoteLimited = await request(app).post('/api/quotes/submit').send(quoteBody).expect(429);
    const orderLimited = await request(app).post('/api/orders/submit').send(orderBody).expect(429);

    expect(quoteLimited.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(orderLimited.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(quoteSubmitUseCase.submit).toHaveBeenCalledTimes(1);
    expect(orderSubmitUseCase.submit).toHaveBeenCalledTimes(1);
  });

  test('returns 502 when the email cannot be delivered', async () => {
    quoteSubmitUseCase.submit.mockRejectedValue(new EmailDeliveryException());

    const response = await request(app).post('/api/quotes/submit').send(quoteBody).expect(502);

    expect(response.body.error).toEqual({
      code: 'EMAIL_DELIVERY_FAILED',
      message: 'No hemos podido enviar el correo. Inténtalo de nuevo en unos minutos.',
    });
  });

  test('returns 404 when a product no longer exists', async () => {
    quoteSubmitUseCase.submit.mockRejectedValue(new ProductNotFoundException(ID_UNIT));

    const response = await request(app).post('/api/quotes/submit').send(quoteBody).expect(404);
    expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});
