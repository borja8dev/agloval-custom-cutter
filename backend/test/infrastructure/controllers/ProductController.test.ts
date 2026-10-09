import request from 'supertest';
import { Express } from 'express';
import { createExpressApp } from '../../../src/infrastructure/config/express';
import { ICalculateUseCase } from '../../../src/application/ports/in/CalculateUseCase';
import { IProductUseCase } from '../../../src/application/ports/in/ProductUseCase';
import { IOrderQuoteUseCase } from '../../../src/application/ports/in/OrderQuoteUseCase';
import {
  FamilySummary,
  ProductRecord,
} from '../../../src/application/ports/out/CalculationPersistence';

describe('Product and family endpoints', () => {
  let app: Express;
  let productUseCase: jest.Mocked<IProductUseCase>;

  const product: ProductRecord = {
    id: 'prod_1',
    name: 'Melamina blanca',
    sku: 'MEL-001',
    unit: 'M2',
    familyCode: 'MEL',
    familyName: 'Melamina',
    categoryName: 'Melamina',
    standardWidth: 244,
    standardHeight: 122,
    thickness: 16,
    lengthCm: null,
    pricePerUnit: 46.1,
    pricePerM2: 15.5,
    currency: 'EUR',
  };

  const families: FamilySummary[] = [
    { code: 'ABC', name: 'Abc', productCount: 3, units: { UD: 1, M2: 1, ML: 1 } },
    { code: 'MEL', name: 'Melamina', productCount: 2, units: { UD: 0, M2: 2, ML: 0 } },
  ];

  beforeEach(() => {
    productUseCase = {
      getAll: jest.fn().mockResolvedValue([product]),
      getById: jest.fn().mockResolvedValue(product),
      search: jest.fn().mockResolvedValue([product]),
      countAll: jest.fn().mockResolvedValue(25),
      countSearch: jest.fn().mockResolvedValue(9),
      listFamilies: jest.fn().mockResolvedValue(families),
    };
    app = createExpressApp({} as ICalculateUseCase, productUseCase, {} as IOrderQuoteUseCase);
  });

  describe('GET /api/families', () => {
    test('returns the families with their counts and a total', async () => {
      const response = await request(app).get('/api/families').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ families, count: 2 });
      expect(productUseCase.listFamilies).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/products', () => {
    test('passes family and unit filters to the use case', async () => {
      const response = await request(app)
        .get('/api/products?family=MEL&unit=M2&limit=10&skip=5')
        .expect(200);

      expect(productUseCase.getAll).toHaveBeenCalledWith(10, 5, { familyCode: 'MEL', unit: 'M2' });
      expect(productUseCase.countAll).toHaveBeenCalledWith({ familyCode: 'MEL', unit: 'M2' });
      expect(response.body.data.products).toEqual([product]);
      expect(response.body.data.count).toBe(1);
      expect(response.body.data.total).toBe(25);
    });

    test('works with a single filter', async () => {
      await request(app).get('/api/products?unit=UD').expect(200);
      expect(productUseCase.getAll).toHaveBeenCalledWith(50, 0, { unit: 'UD' });
    });

    test('works with no filter', async () => {
      await request(app).get('/api/products').expect(200);
      expect(productUseCase.getAll).toHaveBeenCalledWith(50, 0, {});
    });

    test('treats empty filter params as absent', async () => {
      await request(app).get('/api/products?family=&unit=').expect(200);
      expect(productUseCase.getAll).toHaveBeenCalledWith(50, 0, {});
    });

    test('returns an empty list for an unknown family code', async () => {
      productUseCase.getAll.mockResolvedValueOnce([]);
      productUseCase.countAll.mockResolvedValueOnce(0);

      const response = await request(app).get('/api/products?family=NOPE').expect(200);

      expect(response.body.data).toEqual({ products: [], count: 0, total: 0 });
    });

    test('rejects an unknown unit with the standard validation error', async () => {
      const response = await request(app).get('/api/products?unit=KG').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUERY_VALIDATION_ERROR');
      expect(response.body.error.details.fieldErrors.unit).toBeDefined();
      expect(productUseCase.getAll).not.toHaveBeenCalled();
    });

    test('rejects a lowercase unit', async () => {
      await request(app).get('/api/products?unit=m2').expect(400);
    });

    test('rejects repeated family params', async () => {
      await request(app).get('/api/products?family=A&family=B').expect(400);
    });

    test('exposes the catalog fields on each product', async () => {
      const response = await request(app).get('/api/products').expect(200);

      expect(response.body.data.products[0]).toMatchObject({
        sku: 'MEL-001',
        unit: 'M2',
        familyCode: 'MEL',
        familyName: 'Melamina',
        categoryName: 'Melamina',
        pricePerM2: 15.5,
        lengthCm: null,
        standardWidth: 244,
        standardHeight: 122,
        thickness: 16,
      });
    });
  });

  describe('GET /api/products/search', () => {
    test('passes the filters along with the query', async () => {
      const response = await request(app)
        .get('/api/products/search?q=mel&family=MEL&unit=M2&limit=5')
        .expect(200);

      expect(productUseCase.search).toHaveBeenCalledWith('mel', 5, 0, {
        familyCode: 'MEL',
        unit: 'M2',
      });
      expect(productUseCase.countSearch).toHaveBeenCalledWith('mel', {
        familyCode: 'MEL',
        unit: 'M2',
      });
      expect(response.body.data).toMatchObject({ count: 1, total: 9 });
    });

    test('works without filters', async () => {
      await request(app).get('/api/products/search?q=mel').expect(200);
      expect(productUseCase.search).toHaveBeenCalledWith('mel', 50, 0, {});
    });

    test('rejects an unknown unit', async () => {
      const response = await request(app).get('/api/products/search?q=mel&unit=XX').expect(400);
      expect(response.body.error.code).toBe('QUERY_VALIDATION_ERROR');
    });

    test('still rejects a too-short query', async () => {
      const response = await request(app).get('/api/products/search?q=m').expect(400);
      expect(response.body.error.code).toBe('INVALID_QUERY');
    });
  });
});
