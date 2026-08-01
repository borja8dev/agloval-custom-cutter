import { CalculationRequestSchema, validateCalculationRequest } from '../../../src/application/validation/CalculationSchemas';

describe('CalculationRequestSchema', () => {
  test('should validate correct request', () => {
    const validRequest = {
      productId: 'clv9t1a2k0001zzz9qqqqqqqq',
      requestedPieces: [
        { width: 100, height: 100 },
        { width: 200, height: 150 },
      ],
    };

    const result = CalculationRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  test('should reject invalid productId', () => {
    const invalidRequest = {
      productId: 'not-a-cuid',
      requestedPieces: [{ width: 100, height: 100 }],
    };

    const result = CalculationRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  test('should reject empty pieces array', () => {
    const invalidRequest = {
      productId: 'clv9t1a2k0001zzz9qqqqqqqq',
      requestedPieces: [],
    };

    const result = CalculationRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  test('should reject piece with zero width', () => {
    const invalidRequest = {
      productId: 'clv9t1a2k0001zzz9qqqqqqqq',
      requestedPieces: [{ width: 0, height: 100 }],
    };

    const result = CalculationRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  test('should reject piece with negative height', () => {
    const invalidRequest = {
      productId: 'clv9t1a2k0001zzz9qqqqqqqq',
      requestedPieces: [{ width: 100, height: -50 }],
    };

    const result = CalculationRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  test('should accept optional userId', () => {
    const validRequest = {
      productId: 'clv9t1a2k0001zzz9qqqqqqqq',
      requestedPieces: [{ width: 100, height: 100 }],
      userId: 'user_123',
    };

    const result = CalculationRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  test('should accept metadata', () => {
    const validRequest = {
      productId: 'clv9t1a2k0001zzz9qqqqqqqq',
      requestedPieces: [{ width: 100, height: 100 }],
      metadata: {
        source: 'web',
        userEmail: 'test@agloval.com',
      },
    };

    const result = CalculationRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  test('should reject more than 100 pieces', () => {
    const invalidRequest = {
      productId: 'clv9t1a2k0001zzz9qqqqqqqq',
      requestedPieces: Array(101).fill({ width: 10, height: 10 }),
    };

    const result = CalculationRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  test('validateCalculationRequest() should return errors', () => {
    const invalidRequest = {
      productId: 'invalid',
      requestedPieces: [],
    };

    const result = validateCalculationRequest(invalidRequest);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  test('validateCalculationRequest() should return parsed data on success', () => {
    const validRequest = {
      productId: 'clv9t1a2k0001zzz9qqqqqqqq',
      requestedPieces: [{ width: 100, height: 100 }],
    };

    const result = validateCalculationRequest(validRequest);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
