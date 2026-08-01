import request from 'supertest';
import { Express } from 'express';
import { createExpressApp } from '../../../src/infrastructure/config/express';
import { ICalculateUseCase } from '../../../src/application/ports/in/CalculateUseCase';
import { IProductUseCase } from '../../../src/application/ports/in/ProductUseCase';
import { CalculationResponseDTO } from '../../../src/application/dto/CalculationResponse';
import { CalculationNotFoundException } from '../../../src/application/exceptions/ApplicationException';

describe('CalculationController - Integration', () => {
  let app: Express;
  let mockCalculationUseCase: ICalculateUseCase;
  let mockProductUseCase: IProductUseCase;

  const sampleResponse: CalculationResponseDTO = {
    id: 'calc_123',
    product: { id: 'prod_1', name: 'Test Product', categoryName: 'Test' },
    board: { width: 300, height: 200, thickness: 18, area: 6 },
    requestedPieces: [{ width: 100, height: 100 }],
    calculation: {
      totalAreaNeeded: 1,
      boardsNeeded: 0.2,
      wastePercentage: 16.67,
      pieceCount: 1,
      averagePieceSize: 1,
    },
    pricing: {
      pricePerBoard: 100,
      boardsNeeded: 0.2,
      totalPrice: 20,
      currency: 'EUR',
    },
    metadata: {
      calculatedAt: new Date().toISOString(),
      status: 'DRAFT',
    },
  };

  beforeEach(() => {
    mockCalculationUseCase = {
      calculate: jest.fn().mockResolvedValue(sampleResponse),
      getCalculation: jest.fn(),
      listUserCalculations: jest.fn(),
    };

    mockProductUseCase = {
      getAll: jest.fn().mockResolvedValue([]),
      getById: jest.fn(),
      search: jest.fn(),
    };

    app = createExpressApp(mockCalculationUseCase, mockProductUseCase);
  });

  describe('POST /api/calculations', () => {
    test('should create calculation and return 201', async () => {
      const payload = {
        productId: 'clv9t1a2k0001zzz9qqqqqqqq',
        requestedPieces: [
          { width: 200, height: 100 },
          { width: 200, height: 100 },
          { width: 250, height: 120 },
        ],
      };

      const response = await request(app).post('/api/calculations').send(payload).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('calc_123');
      expect(response.body.data.pricing.totalPrice).toBe(20);
      expect(mockCalculationUseCase.calculate).toHaveBeenCalledWith(payload);
    });

    test('should reject invalid productId format', async () => {
      const payload = {
        productId: 'invalid-id',
        requestedPieces: [{ width: 100, height: 100 }],
      };

      const response = await request(app).post('/api/calculations').send(payload).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject empty pieces array', async () => {
      const payload = {
        productId: 'clv9t1a2k0001zzz9qqqqqqqq',
        requestedPieces: [],
      };

      const response = await request(app).post('/api/calculations').send(payload).expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject zero-width piece', async () => {
      const payload = {
        productId: 'clv9t1a2k0001zzz9qqqqqqqq',
        requestedPieces: [{ width: 0, height: 100 }],
      };

      const response = await request(app).post('/api/calculations').send(payload).expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should map domain exceptions to their declared status code', async () => {
      const { InvalidPieceException } = await import('../../../src/domain/exceptions/DomainException');
      const mockError = new InvalidPieceException({ width: 500, height: 100 }, 'Exceeds board width');

      (mockCalculationUseCase.calculate as jest.Mock).mockRejectedValueOnce(mockError);

      const payload = {
        productId: 'clv9t1a2k0001zzz9qqqqqqqq',
        requestedPieces: [{ width: 500, height: 100 }],
      };

      const response = await request(app).post('/api/calculations').send(payload).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PIECE');
    });
  });

  describe('GET /api/calculations/:id', () => {
    test('should fetch calculation by ID', async () => {
      (mockCalculationUseCase.getCalculation as jest.Mock).mockResolvedValueOnce(sampleResponse);

      const response = await request(app).get('/api/calculations/calc_123').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('calc_123');
    });

    test('should return 404 if calculation not found', async () => {
      // getCalculation() throws CalculationNotFoundException (see Phase B.1) —
      // not a generic Error — so this must map to 404, not a fallback 500.
      (mockCalculationUseCase.getCalculation as jest.Mock).mockRejectedValueOnce(
        new CalculationNotFoundException('calc_invalid')
      );

      const response = await request(app).get('/api/calculations/calc_invalid').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CALCULATION_NOT_FOUND');
    });
  });

  describe('GET /health', () => {
    test('should respond with health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    test('should return 404 for unknown route', async () => {
      const response = await request(app).get('/api/unknown').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Error Handler - Response Format', () => {
    test('all error responses should have requestId', async () => {
      const response = await request(app).post('/api/calculations').send({ invalid: 'payload' }).expect(400);

      expect(response.body.requestId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    test('all success responses should have a timestamp', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/products/search (route ordering)', () => {
    test('should reach the search handler, not be swallowed by /:id', async () => {
      (mockProductUseCase.search as jest.Mock).mockResolvedValueOnce([]);

      await request(app).get('/api/products/search?q=melamina').expect(200);

      expect(mockProductUseCase.search).toHaveBeenCalledWith('melamina');
      expect(mockProductUseCase.getById).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/calculations', () => {
    test('should return 401 when no userId is set (no auth wired yet)', async () => {
      const response = await request(app).get('/api/calculations').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PUT/DELETE /api/calculations/:id', () => {
    test('PUT should respond 501 not implemented', async () => {
      const response = await request(app).put('/api/calculations/calc_1').send({}).expect(501);

      expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
    });

    test('DELETE should respond 501 not implemented', async () => {
      const response = await request(app).delete('/api/calculations/calc_1').expect(501);

      expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
    });
  });

  describe('GET /api/products', () => {
    test('should list products', async () => {
      (mockProductUseCase.getAll as jest.Mock).mockResolvedValueOnce([{ id: 'prod_1', name: 'Test' }]);

      const response = await request(app).get('/api/products?limit=10').expect(200);

      expect(response.body.data.count).toBe(1);
      expect(mockProductUseCase.getAll).toHaveBeenCalledWith(10);
    });
  });

  describe('GET /api/products/:id', () => {
    test('should return a product', async () => {
      (mockProductUseCase.getById as jest.Mock).mockResolvedValueOnce({ id: 'prod_1', name: 'Test' });

      const response = await request(app).get('/api/products/prod_1').expect(200);

      expect(response.body.data.id).toBe('prod_1');
    });

    test('should return 404 when the product does not exist', async () => {
      (mockProductUseCase.getById as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app).get('/api/products/prod_missing').expect(404);

      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    test('should reject a search query shorter than 2 characters', async () => {
      const response = await request(app).get('/api/products/search?q=a').expect(400);

      expect(response.body.error.code).toBe('INVALID_QUERY');
    });
  });
});
