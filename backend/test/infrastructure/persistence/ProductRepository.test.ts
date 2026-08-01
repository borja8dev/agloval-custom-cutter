import { PrismaClient } from '@prisma/client';
import { ProductRepository } from '../../../src/infrastructure/persistence/repositories/ProductRepository';
import { getPrismaClient, disconnectPrisma } from '../../../src/infrastructure/config/database';

describe('ProductRepository - Integration', () => {
  let repo: ProductRepository;
  let prisma: PrismaClient;
  let categoryId: string;

  beforeAll(async () => {
    prisma = getPrismaClient();
    repo = new ProductRepository(prisma);

    await prisma.calculation.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
  });

  beforeEach(async () => {
    const category = await prisma.category.create({ data: { name: 'Test Category' } });
    categoryId = category.id;

    await prisma.product.create({
      data: {
        id: 'prod_test_1',
        name: 'Test Product',
        categoryId: category.id,
        standardWidth: 300,
        standardHeight: 200,
        thickness: 18,
        pricePerUnit: 100,
        currency: 'EUR',
      },
    });
  });

  afterEach(async () => {
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('findById()', () => {
    test('should find product by ID', async () => {
      const product = await repo.findById('prod_test_1');

      expect(product).toBeDefined();
      expect(product?.name).toBe('Test Product');
      expect(product?.pricePerUnit).toBe(100);
    });

    test('should return null if product not found', async () => {
      const product = await repo.findById('prod_invalid');
      expect(product).toBeNull();
    });

    test('should include category name', async () => {
      const product = await repo.findById('prod_test_1');
      expect(product?.categoryName).toBe('Test Category');
    });
  });

  describe('findAll()', () => {
    test('should return all products', async () => {
      const products = await repo.findAll();

      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
    });

    test('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await prisma.product.create({
          data: {
            name: `Product ${i}`,
            categoryId,
            standardWidth: 300,
            standardHeight: 200,
            thickness: 18,
            pricePerUnit: 100,
            currency: 'EUR',
          },
        });
      }

      const products = await repo.findAll(3);
      expect(products.length).toBeLessThanOrEqual(3);
    });
  });

  describe('findByCategory()', () => {
    test('should find products in a category', async () => {
      const products = await repo.findByCategory(categoryId);
      expect(products.length).toBeGreaterThan(0);
      expect(products.every((p) => p.categoryName === 'Test Category')).toBe(true);
    });
  });

  describe('search()', () => {
    test('should find product by name', async () => {
      const results = await repo.search('Test');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Test');
    });

    test('should be case-insensitive', async () => {
      const results = await repo.search('test');
      expect(results.length).toBeGreaterThan(0);
    });

    test('should return empty if no match', async () => {
      const results = await repo.search('nonexistent-product');
      expect(results.length).toBe(0);
    });
  });

  describe('count()', () => {
    test('should count total products', async () => {
      const count = await repo.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});
