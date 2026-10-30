import { OrderSubmitRequestSchema } from '../../../src/application/validation/OrderSubmitSchemas';

const ID_A = 'clv9t1a2k0001zzz9qqqqqqqq';

const validBody = {
  orderNumber: 7,
  customer: { name: '  Ana García  ', email: 'ana@example.com', phone: '+34 600 12 34 56' },
  privacyAccepted: true,
  lines: [{ productId: ID_A, quantity: 2 }],
};

const parse = (body: unknown) => OrderSubmitRequestSchema.safeParse(body);
const messages = (body: unknown): string => {
  const result = parse(body);
  return result.success ? '' : result.error.issues.map((i) => i.message).join(' | ');
};
const withCustomer = (customer: Partial<typeof validBody.customer>) => ({
  ...validBody,
  customer: { ...validBody.customer, ...customer },
});

describe('OrderSubmitRequestSchema', () => {
  test('accepts a valid submission and trims the name and phone', () => {
    const result = parse({
      ...validBody,
      customer: { ...validBody.customer, phone: ' 600123456 ' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customer.name).toBe('Ana García');
      expect(result.data.customer.phone).toBe('600123456');
      expect(result.data.orderNumber).toBe(7);
      expect(result.data.lines).toEqual([{ productId: ID_A, quantity: 2 }]);
    }
  });

  test('reuses the quote line rules (pieces xor quantity, defaulted piece quantity)', () => {
    const result = parse({
      ...validBody,
      lines: [{ productId: ID_A, pieces: [{ width: 50, height: 30 }] }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lines[0]?.pieces).toEqual([{ width: 50, height: 30, quantity: 1 }]);
    }

    expect(parse({ ...validBody, lines: [] }).success).toBe(false);
    expect(parse({ ...validBody, lines: [{ productId: ID_A }] }).success).toBe(false);
    expect(parse({ ...validBody, lines: [{ productId: 'not-a-cuid', quantity: 1 }] }).success).toBe(
      false
    );
  });

  test.each([0, -1, 1.5, 1_000_001, '3'])('rejects order number %p', (orderNumber) => {
    expect(parse({ ...validBody, orderNumber }).success).toBe(false);
  });

  test('accepts the order number bounds', () => {
    expect(parse({ ...validBody, orderNumber: 1 }).success).toBe(true);
    expect(parse({ ...validBody, orderNumber: 1_000_000 }).success).toBe(true);
  });

  test.each(['', ' a ', 'x'.repeat(101)])('rejects the name %p in Spanish', (name) => {
    expect(messages(withCustomer({ name }))).toContain('Introduce tu nombre');
  });

  test.each(['', 'ana', 'ana@', 'ana @example.com', `${'a'.repeat(250)}@example.com`])(
    'rejects the email %p in Spanish',
    (email) => {
      expect(messages(withCustomer({ email }))).toContain('Introduce un correo válido');
    }
  );

  test.each(['', '12345', '1234567890123456', '600-12A-345', '600.123.456', '+34 (600) 12-34-5x'])(
    'rejects the phone %p in Spanish',
    (phone) => {
      expect(messages(withCustomer({ phone }))).toContain('Introduce un teléfono válido');
    }
  );

  test.each(['123456', '123456789012345', '+34 (600) 12-34-56'])(
    'accepts the phone %p',
    (phone) => {
      expect(parse(withCustomer({ phone })).success).toBe(true);
    }
  );

  test.each([false, undefined, 'true'])(
    'rejects privacyAccepted %p in Spanish',
    (privacyAccepted) => {
      expect(messages({ ...validBody, privacyAccepted })).toContain(
        'Debes aceptar la política de privacidad'
      );
    }
  );

  test('rejects a missing customer', () => {
    const { customer: _customer, ...rest } = validBody;
    expect(parse(rest).success).toBe(false);
  });

  describe('reference', () => {
    test('is optional', () => {
      const result = parse(validBody);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.reference).toBeUndefined();
    });

    test('is trimmed', () => {
      const result = parse({ ...validBody, reference: '  Obra Calle Mayor  ' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.reference).toBe('Obra Calle Mayor');
    });

    test.each(['', '   '])('treats %p as no reference', (reference) => {
      const result = parse({ ...validBody, reference });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.reference).toBeUndefined();
    });

    test('accepts 80 characters and rejects 81 in Spanish', () => {
      expect(parse({ ...validBody, reference: 'x'.repeat(80) }).success).toBe(true);
      expect(messages({ ...validBody, reference: 'x'.repeat(81) })).toContain(
        'La referencia no puede superar 80 caracteres'
      );
    });

    test.each(['Obra\nMayor', 'Obra\tMayor', 'Obra\u0000Mayor', 'Obra\u007fMayor'])(
      'rejects control characters in %p in Spanish',
      (reference) => {
        expect(messages({ ...validBody, reference })).toContain(
          'La referencia contiene caracteres no válidos'
        );
      }
    );

    test('accepts accents and punctuation', () => {
      expect(parse({ ...validBody, reference: 'Cocina Ñoño · nº 3 (bajo)' }).success).toBe(true);
    });
  });

  describe('fromQuoteNumber', () => {
    test('is optional', () => {
      const result = parse(validBody);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.fromQuoteNumber).toBeUndefined();
    });

    test('accepts the bounds', () => {
      expect(parse({ ...validBody, fromQuoteNumber: 1 }).success).toBe(true);
      expect(parse({ ...validBody, fromQuoteNumber: 1_000_000 }).success).toBe(true);
    });

    test.each([0, -1, 1.5, 1_000_001, '3'])('rejects %p', (fromQuoteNumber) => {
      expect(parse({ ...validBody, fromQuoteNumber }).success).toBe(false);
    });
  });
});
