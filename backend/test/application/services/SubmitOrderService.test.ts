import { SubmitOrderService } from '../../../src/application/services/SubmitOrderService';
import { IOrderQuoteUseCase } from '../../../src/application/ports/in/OrderQuoteUseCase';
import { IOrderNotifier, OrderMessage } from '../../../src/application/ports/out/OrderNotifier';
import { OrderSubmitRequestDTO } from '../../../src/application/dto/OrderSubmit';
import { OrderQuoteResponseDTO } from '../../../src/application/dto/OrderQuote';
import {
  EmailDeliveryException,
  ProductNotFoundException,
} from '../../../src/application/exceptions/ApplicationException';

const ID_UNIT = 'clv9t1a2k0002zzz9qqqqqqqq';

const quote: OrderQuoteResponseDTO = {
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

const request: OrderSubmitRequestDTO = {
  orderNumber: 9,
  customer: { name: 'Ana García', email: 'ana@example.com', phone: '600123456' },
  privacyAccepted: true,
  lines: [{ productId: ID_UNIT, quantity: 12 }],
};

describe('SubmitOrderService', () => {
  let quoteUseCase: jest.Mocked<IOrderQuoteUseCase>;
  let notifier: jest.Mocked<IOrderNotifier>;
  let sent: OrderMessage[];

  beforeEach(() => {
    sent = [];
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    quoteUseCase = { quote: jest.fn().mockResolvedValue(quote) };
    notifier = {
      send: jest.fn(async (message: OrderMessage) => {
        sent.push(message);
      }),
    };
  });

  afterEach(() => jest.restoreAllMocks());

  test('re-quotes only the lines, never trusting client prices', async () => {
    const service = new SubmitOrderService(quoteUseCase, notifier, {});
    await service.submit(request);

    expect(quoteUseCase.quote).toHaveBeenCalledWith({ lines: request.lines });
  });

  test('sends the Agloval email first and then the customer email when configured', async () => {
    const service = new SubmitOrderService(quoteUseCase, notifier, {
      aglovalEmail: 'pedidos@agloval.test',
    });

    const response = await service.submit(request);

    expect(sent.map((m) => m.to)).toEqual(['pedidos@agloval.test', 'ana@example.com']);
    expect(sent[0]?.subject).toBe('Nuevo pedido nº 9 · Ana García');
    expect(sent[0]?.replyTo).toBe('ana@example.com');
    expect(sent[1]?.subject).toBe('Hemos recibido tu solicitud · Pedido nº 9');
    expect(sent[1]?.replyTo).toBeUndefined();
    expect(sent[1]?.text).toContain('4,20 €');
    expect(response.emails).toEqual({ customer: 'sent', agloval: 'sent' });
  });

  test.each([undefined, '', '   '])(
    'skips the Agloval email when the address is %p',
    async (aglovalEmail) => {
      const service = new SubmitOrderService(quoteUseCase, notifier, { aglovalEmail });

      const response = await service.submit(request);

      expect(sent.map((m) => m.to)).toEqual(['ana@example.com']);
      expect(response.emails).toEqual({ customer: 'sent', agloval: 'skipped' });
    }
  );

  test('passes the reference and the source quote number to both emails', async () => {
    const service = new SubmitOrderService(quoteUseCase, notifier, {
      aglovalEmail: 'pedidos@agloval.test',
    });

    await service.submit({ ...request, reference: 'Obra Calle Mayor', fromQuoteNumber: 4 });

    expect(sent[0]?.subject).toBe('Nuevo pedido nº 9 · Ana García · Obra Calle Mayor');
    for (const message of sent) {
      expect(message.text).toContain('Referencia: Obra Calle Mayor');
      expect(message.text).toContain('Desde el presupuesto nº 4');
    }
  });

  test('returns the order number and the server quote', async () => {
    const service = new SubmitOrderService(quoteUseCase, notifier, {});

    await expect(service.submit(request)).resolves.toEqual({
      orderNumber: 9,
      quote,
      emails: { customer: 'sent', agloval: 'skipped' },
    });
  });

  test('maps a notifier failure to EmailDeliveryException', async () => {
    notifier.send.mockRejectedValue(new Error('ECONNREFUSED'));
    const service = new SubmitOrderService(quoteUseCase, notifier, {});

    const error = await service.submit(request).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(EmailDeliveryException);
    expect(error).toMatchObject({
      code: 'EMAIL_DELIVERY_FAILED',
      statusCode: 502,
      message: 'No hemos podido enviar el correo. Inténtalo de nuevo en unos minutos.',
    });
  });

  test('does not email the customer when the Agloval email fails', async () => {
    notifier.send.mockRejectedValueOnce(new Error('timeout'));
    const service = new SubmitOrderService(quoteUseCase, notifier, {
      aglovalEmail: 'pedidos@agloval.test',
    });

    await expect(service.submit(request)).rejects.toBeInstanceOf(EmailDeliveryException);
    expect(notifier.send).toHaveBeenCalledTimes(1);
  });

  test('lets quote errors through and sends nothing', async () => {
    quoteUseCase.quote.mockRejectedValue(new ProductNotFoundException(ID_UNIT));
    const service = new SubmitOrderService(quoteUseCase, notifier, {});

    await expect(service.submit(request)).rejects.toBeInstanceOf(ProductNotFoundException);
    expect(notifier.send).not.toHaveBeenCalled();
  });
});
