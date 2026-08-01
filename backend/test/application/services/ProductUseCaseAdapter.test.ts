import { ProductUseCaseAdapter } from '../../../src/application/services/ProductUseCaseAdapter';
import { IProductRepository, ProductRecord } from '../../../src/application/ports/out/CalculationPersistence';

describe('ProductUseCaseAdapter', () => {
  const sampleProduct: ProductRecord = {
    id: 'prod_1',
    name: 'Test',
    categoryName: 'Test Category',
    standardWidth: 300,
    standardHeight: 200,
    thickness: 18,
    pricePerUnit: 100,
    currency: 'EUR',
  };

  let repo: IProductRepository;
  let adapter: ProductUseCaseAdapter;

  beforeEach(() => {
    repo = {
      findById: jest.fn().mockResolvedValue(sampleProduct),
      findAll: jest.fn().mockResolvedValue([sampleProduct]),
      findByCategory: jest.fn().mockResolvedValue([sampleProduct]),
      search: jest.fn().mockResolvedValue([sampleProduct]),
    };
    adapter = new ProductUseCaseAdapter(repo);
  });

  test('getAll() delegates to repository.findAll()', async () => {
    const result = await adapter.getAll(10);
    expect(repo.findAll).toHaveBeenCalledWith(10);
    expect(result).toEqual([sampleProduct]);
  });

  test('getById() delegates to repository.findById()', async () => {
    const result = await adapter.getById('prod_1');
    expect(repo.findById).toHaveBeenCalledWith('prod_1');
    expect(result).toEqual(sampleProduct);
  });

  test('search() delegates to repository.search()', async () => {
    const result = await adapter.search('melamina');
    expect(repo.search).toHaveBeenCalledWith('melamina');
    expect(result).toEqual([sampleProduct]);
  });
});
