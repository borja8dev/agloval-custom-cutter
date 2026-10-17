import { OrderQuoteRequestSchema } from '../../../src/application/validation/OrderQuoteSchemas';

const ID_A = 'clv9t1a2k0001zzz9qqqqqqqq';
const ID_B = 'clv9t1a2k0002zzz9qqqqqqqq';

const parse = (body: unknown) => OrderQuoteRequestSchema.safeParse(body);
const messages = (body: unknown): string => {
  const result = parse(body);
  return result.success ? '' : result.error.issues.map((i) => i.message).join(' | ');
};

describe('OrderQuoteRequestSchema', () => {
  test('accepts a mixed order and defaults the piece quantity to 1', () => {
    const result = parse({
      lines: [
        {
          productId: ID_A,
          pieces: [
            { width: 100, height: 80, quantity: 20 },
            { width: 50, height: 30 },
          ],
        },
        { productId: ID_B, quantity: 12 },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lines[0]?.pieces).toEqual([
        { width: 100, height: 80, quantity: 20 },
        { width: 50, height: 30, quantity: 1 },
      ]);
      expect(result.data.lines[1]?.quantity).toBe(12);
    }
  });

  test('accepts decimal piece sizes', () => {
    expect(
      parse({ lines: [{ productId: ID_A, pieces: [{ width: 10.5, height: 20.25 }] }] }).success
    ).toBe(true);
  });

  test('rejects empty lines', () => {
    expect(parse({ lines: [] }).success).toBe(false);
    expect(parse({}).success).toBe(false);
  });

  test('rejects more than 100 lines', () => {
    const lines = Array.from({ length: 101 }, () => ({ productId: ID_B, quantity: 1 }));
    expect(parse({ lines }).success).toBe(false);
    expect(parse({ lines: lines.slice(0, 100) }).success).toBe(true);
  });

  test('rejects a line with neither pieces nor quantity', () => {
    expect(messages({ lines: [{ productId: ID_A }] })).toMatch(/pieces.*quantity/i);
  });

  test('rejects a line with both pieces and quantity', () => {
    const body = { lines: [{ productId: ID_A, quantity: 2, pieces: [{ width: 50, height: 50 }] }] };
    expect(messages(body)).toMatch(/not both/i);
  });

  test('rejects an invalid product id', () => {
    expect(parse({ lines: [{ productId: 'nope', quantity: 1 }] }).success).toBe(false);
  });

  test.each([0, -1, 1.5, 100001])('rejects line quantity %s', (quantity) => {
    expect(parse({ lines: [{ productId: ID_B, quantity }] }).success).toBe(false);
  });

  test('line quantity bounds are 1 and 100000', () => {
    expect(parse({ lines: [{ productId: ID_B, quantity: 1 }] }).success).toBe(true);
    expect(parse({ lines: [{ productId: ID_B, quantity: 100000 }] }).success).toBe(true);
  });

  test.each([0, -3, 2.5, 10001])('rejects piece quantity %s', (quantity) => {
    const body = { lines: [{ productId: ID_A, pieces: [{ width: 50, height: 50, quantity }] }] };
    expect(parse(body).success).toBe(false);
  });

  test('rejects an empty pieces list and more than 200 pieces', () => {
    expect(parse({ lines: [{ productId: ID_A, pieces: [] }] }).success).toBe(false);
    const pieces = Array.from({ length: 201 }, () => ({ width: 50, height: 50 }));
    expect(parse({ lines: [{ productId: ID_A, pieces }] }).success).toBe(false);
    expect(parse({ lines: [{ productId: ID_A, pieces: pieces.slice(0, 200) }] }).success).toBe(
      true
    );
  });

  test('rejects pieces below the 2 x 15 cm minimum', () => {
    expect(
      messages({ lines: [{ productId: ID_A, pieces: [{ width: 1.5, height: 50 }] }] })
    ).toMatch(/at least 2 cm/);
    expect(messages({ lines: [{ productId: ID_A, pieces: [{ width: 50, height: 14 }] }] })).toMatch(
      /at least 15 cm/
    );
  });
});
