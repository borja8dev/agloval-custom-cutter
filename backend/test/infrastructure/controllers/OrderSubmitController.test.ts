import request from 'supertest';
import { Express } from 'express';
import { createExpressApp } from '../../../src/infrastructure/config/express';
import { ICalculateUseCase } from '../../../src/application/ports/in/CalculateUseCase';
import { IProductUseCase } from '../../../src/application/ports/in/ProductUseCase';
import { IOrderQuoteUseCase } from '../../../src/application/ports/in/OrderQuoteUseCase';
import { IOrderSubmitUseCase } from '../../../src/application/ports/in/OrderSubmitUseCase';
import { IQuoteSubmitUseCase } from '../../../src/application/ports/in/QuoteSubmitUseCase';
import { OrderSubmitResponseDTO } from '../../../src/application/dto/OrderSubmit';
import {
  EmailDeliveryException,
  ProductNotFoundException,
} from '../../../src/application/exceptions/ApplicationException';

const ID_UNIT = 'clv9t1a2k0002zzz9qqqqqqqq';

const submitResponse: OrderSubmitResponseDTO = {
  orderNumber: 12,
  quote: {
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
  },
  emails: { customer: 'sent', agloval: 'skipped' },
};

const body = {
  orderNumber: 12,
  customer: { name: 'Ana García', email: 'ana@example.com', phone: '600 123 456' },
  privacyAccepted: true,
  lines: [{ productId: ID_UNIT, quantity: 12 }],
};

describe('POST /api/orders/submit', () => {
  let app: Express;
  let orderSubmitUseCase: jest.Mocked<IOrderSubmitUseCase>;

  const buildApp = (submitRateLimit = { max: 100, windowMs: 60_000 }) =>
    createExpressApp({
      calculationUseCase: {} as ICalculateUseCase,
      productUseCase: {} as IProductUseCase,
      orderQuoteUseCase: {} as IOrderQuoteUseCase,
      orderSubmitUseCase,
      quoteSubmitUseCase: {} as IQuoteSubmitUseCase,
      submitRateLimit,
    });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    orderSubmitUseCase = { submit: jest.fn().mockResolvedValue(submitResponse) };
    app = buildApp();
  });

  afterEach(() => jest.restoreAllMocks());

  test('submits the order and returns 201 in the ApiResponse envelope', async () => {
    const response = await request(app).post('/api/orders/submit').send(body).expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(submitResponse);
    expect(orderSubmitUseCase.submit).toHaveBeenCalledWith(body);
  });

  test('passes the optional reference and source quote number to the use case', async () => {
    const withExtras = { ...body, reference: ' Obra Calle Mayor ', fromQuoteNumber: 4 };

    await request(app).post('/api/orders/submit').send(withExtras).expect(201);

    expect(orderSubmitUseCase.submit).toHaveBeenCalledWith({
      ...withExtras,
      reference: 'Obra Calle Mayor',
    });
  });

  test('returns 400 for an invalid reference or source quote number', async () => {
    const response = await request(app)
      .post('/api/orders/submit')
      .send({ ...body, reference: 'a\nb', fromQuoteNumber: 0 })
      .expect(400);

    const fieldErrors = JSON.stringify(response.body.error.details);
    expect(fieldErrors).toContain('La referencia contiene caracteres no válidos');
    expect(fieldErrors).toContain('fromQuoteNumber');
    expect(orderSubmitUseCase.submit).not.toHaveBeenCalled();
  });

  test('returns 400 with the Spanish messages and does not call the use case', async () => {
    const response = await request(app)
      .post('/api/orders/submit')
      .send({
        ...body,
        customer: { name: '', email: 'nope', phone: '12' },
        privacyAccepted: false,
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    const fieldErrors = JSON.stringify(response.body.error.details);
    expect(fieldErrors).toContain('Introduce tu nombre');
    expect(fieldErrors).toContain('Introduce un correo válido');
    expect(fieldErrors).toContain('Introduce un teléfono válido');
    expect(fieldErrors).toContain('Debes aceptar la política de privacidad');
    expect(orderSubmitUseCase.submit).not.toHaveBeenCalled();
  });

  test('returns 429 once the per-IP limit is reached', async () => {
    app = buildApp({ max: 2, windowMs: 60_000 });

    await request(app).post('/api/orders/submit').send(body).expect(201);
    await request(app).post('/api/orders/submit').send(body).expect(201);
    const response = await request(app).post('/api/orders/submit').send(body).expect(429);

    expect(response.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(orderSubmitUseCase.submit).toHaveBeenCalledTimes(2);
  });

  test('does not rate-limit the quote route', async () => {
    const quote = { quote: jest.fn().mockResolvedValue(submitResponse.quote) };
    app = createExpressApp({
      calculationUseCase: {} as ICalculateUseCase,
      productUseCase: {} as IProductUseCase,
      orderQuoteUseCase: quote,
      orderSubmitUseCase,
      quoteSubmitUseCase: {} as IQuoteSubmitUseCase,
      submitRateLimit: { max: 1, windowMs: 60_000 },
    });

    for (let i = 0; i < 3; i++) {
      await request(app).post('/api/orders/quote').send({ lines: body.lines }).expect(200);
    }
  });

  test('returns 502 when the email cannot be delivered', async () => {
    orderSubmitUseCase.submit.mockRejectedValue(new EmailDeliveryException());

    const response = await request(app).post('/api/orders/submit').send(body).expect(502);

    expect(response.body.error).toEqual({
      code: 'EMAIL_DELIVERY_FAILED',
      message: 'No hemos podido enviar el correo. Inténtalo de nuevo en unos minutos.',
    });
  });

  test('returns 404 when a product no longer exists', async () => {
    orderSubmitUseCase.submit.mockRejectedValue(new ProductNotFoundException(ID_UNIT));

    const response = await request(app).post('/api/orders/submit').send(body).expect(404);
    expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});
