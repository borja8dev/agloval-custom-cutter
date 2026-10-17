import { ProductUseCaseAdapter } from '../../../src/application/services/ProductUseCaseAdapter';
import {
  FamilySummary,
  IProductRepository,
  ProductRecord,
} from '../../../src/application/ports/out/CalculationPersistence';

describe('ProductUseCaseAdapter', () => {
  const sampleProduct: ProductRecord = {
    id: 'prod_1',
    name: 'Test',
    sku: 'SKU-1',
    unit: 'M2',
    familyCode: 'TEST',
    familyName: 'Test Category',
    categoryName: 'Test Category',
    standardWidth: 300,
    standardHeight: 200,
    thickness: 18,
    lengthCm: null,
    pricePerUnit: 100,
    pricePerM2: null,
    currency: 'EUR',
  };

  const sampleFamily: FamilySummary = {
    code: 'TEST',
    name: 'Test Category',
    productCount: 3,
    units: { UD: 1, M2: 1, ML: 1 },
  };

  let repo: IProductRepository;
  let adapter: ProductUseCaseAdapter;

  beforeEach(() => {
    repo = {
      findById: jest.fn().mockResolvedValue(sampleProduct),
      findByIds: jest.fn(),
      findAll: jest.fn().mockResolvedValue([sampleProduct]),
      findByCategory: jest.fn().mockResolvedValue([sampleProduct]),
      search: jest.fn().mockResolvedValue([sampleProduct]),
      count: jest.fn().mockResolvedValue(42),
      countSearch: jest.fn().mockResolvedValue(7),
      listFamilies: jest.fn().mockResolvedValue([sampleFamily]),
    };
    adapter = new ProductUseCaseAdapter(repo);
  });

  test('getAll() delegates to repository.findAll()', async () => {
    const result = await adapter.getAll(10);
    expect(repo.findAll).toHaveBeenCalledWith(10, undefined, undefined);
    expect(result).toEqual([sampleProduct]);
  });

  test('getById() delegates to repository.findById()', async () => {
    const result = await adapter.getById('prod_1');
    expect(repo.findById).toHaveBeenCalledWith('prod_1');
    expect(result).toEqual(sampleProduct);
  });

  test('search() delegates to repository.search()', async () => {
    const result = await adapter.search('melamina');
    expect(repo.search).toHaveBeenCalledWith('melamina', undefined, undefined, undefined);
    expect(result).toEqual([sampleProduct]);
  });

  test('getAll() forwards the family and unit filter', async () => {
    await adapter.getAll(10, 5, { familyCode: 'TEST', unit: 'UD' });
    expect(repo.findAll).toHaveBeenCalledWith(10, 5, { familyCode: 'TEST', unit: 'UD' });
  });

  test('search() forwards the filter', async () => {
    await adapter.search('melamina', 10, 0, { unit: 'M2' });
    expect(repo.search).toHaveBeenCalledWith('melamina', 10, 0, { unit: 'M2' });
  });

  test('countAll() and countSearch() delegate with the filter', async () => {
    expect(await adapter.countAll({ familyCode: 'TEST' })).toBe(42);
    expect(repo.count).toHaveBeenCalledWith({ familyCode: 'TEST' });
    expect(await adapter.countSearch('mel', { unit: 'UD' })).toBe(7);
    expect(repo.countSearch).toHaveBeenCalledWith('mel', { unit: 'UD' });
  });

  test('listFamilies() delegates to repository.listFamilies()', async () => {
    expect(await adapter.listFamilies()).toEqual([sampleFamily]);
  });
});
