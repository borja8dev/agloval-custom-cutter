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
    const category = await prisma.category.create({
      data: { name: 'Test Category', code: 'TESTCAT' },
    });
    categoryId = category.id;

    await prisma.product.create({
      data: {
        id: 'prod_test_1',
        sku: 'SKU-TEST-1',
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

  describe('findByIds()', () => {
    beforeEach(async () => {
      await prisma.product.create({
        data: { id: 'prod_ud_a', sku: 'UD-A', name: 'A', categoryId, unit: 'UD', pricePerUnit: 1 },
      });
    });

    test('returns every matching product with its family in one call', async () => {
      const products = await repo.findByIds(['prod_test_1', 'prod_ud_a']);

      expect(products.map((p) => p.id).sort()).toEqual(['prod_test_1', 'prod_ud_a']);
      expect(products.find((p) => p.id === 'prod_ud_a')).toMatchObject({
        unit: 'UD',
        familyCode: 'TESTCAT',
        pricePerUnit: 1,
      });
    });

    test('silently skips ids that do not exist', async () => {
      const products = await repo.findByIds(['prod_test_1', 'prod_missing']);
      expect(products.map((p) => p.id)).toEqual(['prod_test_1']);
    });

    test('returns each product once even when the input repeats an id', async () => {
      const products = await repo.findByIds(['prod_test_1', 'prod_test_1', 'prod_test_1']);
      expect(products).toHaveLength(1);
    });

    test('returns an empty list for an empty input', async () => {
      expect(await repo.findByIds([])).toEqual([]);
    });
  });

  describe('non-board products', () => {
    test('persists and reads back a UD product with null dimensions', async () => {
      await prisma.product.create({
        data: {
          id: 'prod_ud_1',
          sku: 'UD-0001',
          name: 'Tornillo',
          categoryId,
          unit: 'UD',
          pricePerUnit: 0.35,
          currency: 'EUR',
        },
      });

      const product = await repo.findById('prod_ud_1');

      expect(product).toMatchObject({
        sku: 'UD-0001',
        unit: 'UD',
        familyCode: 'TESTCAT',
        familyName: 'Test Category',
        standardWidth: null,
        standardHeight: null,
        thickness: null,
        lengthCm: null,
        pricePerM2: null,
        pricePerUnit: 0.35,
      });
    });

    test('rejects a duplicated sku', async () => {
      await expect(
        prisma.product.create({
          data: {
            sku: 'SKU-TEST-1',
            name: 'Duplicate',
            categoryId,
            pricePerUnit: 1,
          },
        })
      ).rejects.toThrow();
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
            sku: `SKU-LOOP-${i}`,
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

  describe('filters, ordering and counts', () => {
    let otherCategoryId: string;

    beforeEach(async () => {
      const other = await prisma.category.create({ data: { name: 'Other Family', code: 'OTHER' } });
      otherCategoryId = other.id;

      const base = { currency: 'EUR', pricePerUnit: 10 };
      await prisma.product.createMany({
        data: [
          { sku: 'F-UD-1', name: 'Alpha ud', categoryId, unit: 'UD', ...base },
          { sku: 'F-UD-2', name: 'Alpha ud two', categoryId, unit: 'UD', ...base },
          { sku: 'F-ML-1', name: 'Alpha ml', categoryId, unit: 'ML', lengthCm: 250, ...base },
          {
            sku: 'O-UD-1',
            name: 'Alpha other ud',
            categoryId: otherCategoryId,
            unit: 'UD',
            ...base,
          },
          {
            sku: 'O-M2-1',
            name: 'Alpha other m2',
            categoryId: otherCategoryId,
            unit: 'M2',
            standardWidth: 244,
            standardHeight: 122,
            pricePerM2: 15.5,
            ...base,
          },
        ],
      });
    });

    test('findAll() filters by family code', async () => {
      const products = await repo.findAll(50, 0, { familyCode: 'OTHER' });
      expect(products.map((p) => p.sku).sort()).toEqual(['O-M2-1', 'O-UD-1']);
      expect(products.every((p) => p.familyCode === 'OTHER')).toBe(true);
    });

    test('findAll() filters by unit', async () => {
      const products = await repo.findAll(50, 0, { unit: 'UD' });
      expect(products.map((p) => p.sku).sort()).toEqual(['F-UD-1', 'F-UD-2', 'O-UD-1']);
    });

    test('findAll() combines family and unit', async () => {
      const products = await repo.findAll(50, 0, { familyCode: 'TESTCAT', unit: 'UD' });
      expect(products.map((p) => p.sku).sort()).toEqual(['F-UD-1', 'F-UD-2']);
    });

    test('findAll() returns an empty list for an unknown family code', async () => {
      expect(await repo.findAll(50, 0, { familyCode: 'NOPE' })).toEqual([]);
    });

    test('findAll() exposes the catalog fields on the record', async () => {
      const [product] = await repo.findAll(50, 0, { unit: 'ML' });
      expect(product).toMatchObject({
        sku: 'F-ML-1',
        unit: 'ML',
        familyCode: 'TESTCAT',
        familyName: 'Test Category',
        lengthCm: 250,
        pricePerM2: null,
      });
      const [m2] = await repo.findAll(50, 0, { unit: 'M2', familyCode: 'OTHER' });
      expect(m2).toMatchObject({ standardWidth: 244, standardHeight: 122, pricePerM2: 15.5 });
    });

    test('pagination applies on top of the filter with a stable order', async () => {
      const all = await repo.findAll(50, 0, { unit: 'UD' });
      const pageOne = await repo.findAll(2, 0, { unit: 'UD' });
      const pageTwo = await repo.findAll(2, 2, { unit: 'UD' });
      expect([...pageOne, ...pageTwo].map((p) => p.id)).toEqual(all.map((p) => p.id));
      expect(pageTwo).toHaveLength(1);
    });

    test('order is deterministic when createdAt ties (sku is the tiebreaker)', async () => {
      const sameInstant = new Date('2026-01-01T00:00:00.000Z');
      await prisma.product.updateMany({ data: { createdAt: sameInstant } });
      const first = await repo.findAll(50, 0);
      const second = await repo.findAll(50, 0);
      expect(first.map((p) => p.sku)).toEqual(second.map((p) => p.sku));
      expect(first.map((p) => p.sku)).toEqual([...first.map((p) => p.sku)].sort());
    });

    test('count() reflects the filter, not the page', async () => {
      expect(await repo.count()).toBe(6);
      expect(await repo.count({ unit: 'UD' })).toBe(3);
      expect(await repo.count({ familyCode: 'OTHER' })).toBe(2);
      expect(await repo.count({ familyCode: 'TESTCAT', unit: 'ML' })).toBe(1);
      expect(await repo.count({ familyCode: 'NOPE' })).toBe(0);
    });

    test('search() applies family and unit filters', async () => {
      const all = await repo.search('alpha');
      expect(all).toHaveLength(5);
      const filtered = await repo.search('alpha', 50, 0, { familyCode: 'OTHER', unit: 'UD' });
      expect(filtered.map((p) => p.sku)).toEqual(['O-UD-1']);
    });

    test('search() paginates with the filter', async () => {
      const page = await repo.search('alpha', 1, 1, { unit: 'UD' });
      expect(page).toHaveLength(1);
    });

    test('countSearch() counts every match of the query and filter', async () => {
      expect(await repo.countSearch('alpha')).toBe(5);
      expect(await repo.countSearch('alpha', { unit: 'UD' })).toBe(3);
      expect(await repo.countSearch('alpha', { familyCode: 'OTHER' })).toBe(2);
      expect(await repo.countSearch('zzz')).toBe(0);
    });
  });

  describe('listFamilies()', () => {
    test('returns every family sorted by code with per-unit counts', async () => {
      const zeta = await prisma.category.create({ data: { name: 'Zeta', code: 'ZETA' } });
      const alpha = await prisma.category.create({ data: { name: 'Alpha', code: 'ALPHA' } });
      await prisma.category.create({ data: { name: 'Empty', code: 'EMPTY' } });
      const base = { currency: 'EUR', pricePerUnit: 1 };
      await prisma.product.createMany({
        data: [
          { sku: 'L-1', name: 'a', categoryId: alpha.id, unit: 'UD', ...base },
          { sku: 'L-2', name: 'b', categoryId: alpha.id, unit: 'UD', ...base },
          { sku: 'L-3', name: 'c', categoryId: alpha.id, unit: 'ML', lengthCm: 100, ...base },
          {
            sku: 'L-4',
            name: 'd',
            categoryId: zeta.id,
            unit: 'M2',
            standardWidth: 1,
            standardHeight: 1,
            ...base,
          },
        ],
      });

      const families = await repo.listFamilies();

      expect(families.map((f) => f.code)).toEqual(['ALPHA', 'EMPTY', 'TESTCAT', 'ZETA']);
      expect(families.find((f) => f.code === 'ALPHA')).toEqual({
        code: 'ALPHA',
        name: 'Alpha',
        productCount: 3,
        units: { UD: 2, M2: 0, ML: 1 },
      });
      expect(families.find((f) => f.code === 'EMPTY')).toEqual({
        code: 'EMPTY',
        name: 'Empty',
        productCount: 0,
        units: { UD: 0, M2: 0, ML: 0 },
      });
      expect(families.find((f) => f.code === 'ZETA')?.units).toEqual({ UD: 0, M2: 1, ML: 0 });
    });

    test('uses a fixed number of queries regardless of the family count', async () => {
      const spy = jest.spyOn(prisma.category, 'findMany');
      const groupSpy = jest.spyOn(prisma.product, 'groupBy');
      await repo.listFamilies();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(groupSpy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
      groupSpy.mockRestore();
    });
  });
});
