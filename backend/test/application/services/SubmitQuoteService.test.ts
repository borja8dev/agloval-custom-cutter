import { SubmitQuoteService } from '../../../src/application/services/SubmitQuoteService';
import { IOrderQuoteUseCase } from '../../../src/application/ports/in/OrderQuoteUseCase';
import { IOrderNotifier, OrderMessage } from '../../../src/application/ports/out/OrderNotifier';
import { QuoteSubmitRequestDTO } from '../../../src/application/dto/QuoteSubmit';
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

const request: QuoteSubmitRequestDTO = {
  quoteNumber: 3,
  customer: { name: 'Ana García', email: 'ana@example.com', phone: '600123456' },
  reference: 'Obra Calle Mayor',
  privacyAccepted: true,
  lines: [{ productId: ID_UNIT, quantity: 12 }],
};

describe('SubmitQuoteService', () => {
  let quoteUseCase: jest.Mocked<IOrderQuoteUseCase>;
  let notifier: jest.Mocked<IOrderNotifier>;
  let sent: OrderMessage[];
  let service: SubmitQuoteService;

  beforeEach(() => {
    sent = [];
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    quoteUseCase = { quote: jest.fn().mockResolvedValue(quote) };
    notifier = {
      send: jest.fn(async (message: OrderMessage) => {
        sent.push(message);
      }),
    };
    service = new SubmitQuoteService(quoteUseCase, notifier);
  });

  afterEach(() => jest.restoreAllMocks());

  test('re-quotes only the lines, never trusting client prices', async () => {
    await service.submit(request);

    expect(quoteUseCase.quote).toHaveBeenCalledWith({ lines: request.lines });
  });

  test('emails only the customer with the quote', async () => {
    await service.submit(request);

    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe('ana@example.com');
    expect(sent[0]?.subject).toBe('Tu presupuesto · Presupuesto nº 3');
    expect(sent[0]?.text).toContain('Referencia: Obra Calle Mayor');
    expect(sent[0]?.text).toContain('4,20 €');
    expect(sent[0]?.replyTo).toBeUndefined();
  });

  test('never emails Agloval, even when ORDER_NOTIFICATION_EMAIL is configured', async () => {
    const previous = process.env.ORDER_NOTIFICATION_EMAIL;
    process.env.ORDER_NOTIFICATION_EMAIL = 'pedidos@agloval.test';
    try {
      // The constructor takes no Agloval address at all: there is nothing to configure.
      expect(SubmitQuoteService.length).toBe(2);
      await new SubmitQuoteService(quoteUseCase, notifier).submit(request);
    } finally {
      if (previous === undefined) delete process.env.ORDER_NOTIFICATION_EMAIL;
      else process.env.ORDER_NOTIFICATION_EMAIL = previous;
    }

    expect(sent.map((m) => m.to)).toEqual(['ana@example.com']);
  });

  test('returns the quote number, the server quote and the email status', async () => {
    await expect(service.submit(request)).resolves.toEqual({
      quoteNumber: 3,
      quote,
      emails: { customer: 'sent' },
    });
  });

  test('maps a notifier failure to EmailDeliveryException', async () => {
    notifier.send.mockRejectedValue(new Error('ECONNREFUSED'));

    const error = await service.submit(request).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(EmailDeliveryException);
    expect(error).toMatchObject({ code: 'EMAIL_DELIVERY_FAILED', statusCode: 502 });
  });

  test('lets quote errors through and sends nothing', async () => {
    quoteUseCase.quote.mockRejectedValue(new ProductNotFoundException(ID_UNIT));

    await expect(service.submit(request)).rejects.toBeInstanceOf(ProductNotFoundException);
    expect(notifier.send).not.toHaveBeenCalled();
  });
});
