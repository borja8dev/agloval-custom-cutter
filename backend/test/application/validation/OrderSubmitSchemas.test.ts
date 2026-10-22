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
});
