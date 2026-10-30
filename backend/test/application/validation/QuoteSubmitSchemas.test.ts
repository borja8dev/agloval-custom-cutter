import { QuoteSubmitRequestSchema } from '../../../src/application/validation/QuoteSubmitSchemas';

const ID_A = 'clv9t1a2k0001zzz9qqqqqqqq';

const validBody = {
  quoteNumber: 4,
  customer: { name: '  Ana García  ', email: 'ana@example.com', phone: '600123456' },
  privacyAccepted: true,
  lines: [{ productId: ID_A, quantity: 2 }],
};

const parse = (body: unknown) => QuoteSubmitRequestSchema.safeParse(body);
const messages = (body: unknown): string => {
  const result = parse(body);
  return result.success ? '' : result.error.issues.map((i) => i.message).join(' | ');
};

describe('QuoteSubmitRequestSchema', () => {
  test('accepts a valid submission and trims the customer name', () => {
    const result = parse(validBody);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quoteNumber).toBe(4);
      expect(result.data.customer.name).toBe('Ana García');
      expect(result.data.reference).toBeUndefined();
    }
  });

  test.each([0, -1, 1.5, 1_000_001, '3', undefined])('rejects quote number %p', (quoteNumber) => {
    expect(parse({ ...validBody, quoteNumber }).success).toBe(false);
  });

  test('accepts the quote number bounds', () => {
    expect(parse({ ...validBody, quoteNumber: 1 }).success).toBe(true);
    expect(parse({ ...validBody, quoteNumber: 1_000_000 }).success).toBe(true);
  });

  test('uses the same Spanish customer and privacy messages as orders', () => {
    const errors = messages({
      ...validBody,
      customer: { name: '', email: 'nope', phone: '12' },
      privacyAccepted: false,
    });
    expect(errors).toContain('Introduce tu nombre');
    expect(errors).toContain('Introduce un correo válido');
    expect(errors).toContain('Introduce un teléfono válido');
    expect(errors).toContain('Debes aceptar la política de privacidad');
  });

  test('trims the reference, drops an empty one and rejects invalid ones in Spanish', () => {
    const trimmed = parse({ ...validBody, reference: ' Baño ' });
    expect(trimmed.success && trimmed.data.reference).toBe('Baño');

    const empty = parse({ ...validBody, reference: ' ' });
    expect(empty.success).toBe(true);
    if (empty.success) expect(empty.data.reference).toBeUndefined();

    expect(messages({ ...validBody, reference: 'x'.repeat(81) })).toContain(
      'La referencia no puede superar 80 caracteres'
    );
    expect(messages({ ...validBody, reference: 'a\nb' })).toContain(
      'La referencia contiene caracteres no válidos'
    );
  });

  test('requires between 1 and 100 lines', () => {
    expect(parse({ ...validBody, lines: [] }).success).toBe(false);
    const many = Array.from({ length: 101 }, () => ({ productId: ID_A, quantity: 1 }));
    expect(parse({ ...validBody, lines: many }).success).toBe(false);
  });

  test('does not accept fromQuoteNumber', () => {
    const result = parse({ ...validBody, fromQuoteNumber: 2 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('fromQuoteNumber');
  });
});
