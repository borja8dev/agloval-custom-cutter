import { PrismaClient } from '@prisma/client';
import { getPrismaClient, disconnectPrisma } from '../../../src/infrastructure/config/database';
import { importCatalog } from '../../../src/infrastructure/catalog/importCatalog';
import { CatalogItem } from '../../../src/infrastructure/catalog/catalogTypes';

const items = (): CatalogItem[] => [
  { sku: 'IT-1', familyCode: 'F1', name: 'Board A', rawDescription: 'Board A', unit: 'M2', price: 10, widthCm: 200, heightCm: 100, thicknessMm: 16 },
  { sku: 'IT-2', familyCode: 'F1', name: 'Piece B', rawDescription: '% Piece B', unit: 'UD', price: 3.5 },
  { sku: 'IT-3', familyCode: 'F2', name: 'Strip C', rawDescription: 'Strip C', unit: 'ML', price: 1.2, lengthCm: 240 },
  { sku: 'IT-4', familyCode: 'F3', name: 'Piece D', rawDescription: 'Piece D', unit: 'UD', price: 7 },
  { sku: 'IT-5', familyCode: 'F2', name: 'Piece E', rawDescription: 'Piece E', unit: 'UD', price: 9 }
];
const families = { F1: 'Family One', F2: 'Family Two' };

describe('importCatalog (test database)', () => {
  let prisma: PrismaClient;

  const clean = async () => {
    await prisma.calculation.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
  };

  beforeAll(async () => {
    prisma = getPrismaClient();
    await clean();
  });
  afterEach(clean);
  afterAll(disconnectPrisma);

  it('creates categories and products and reports unnamed families', async () => {
    const result = await importCatalog(prisma, items(), families);
    expect(result).toEqual({ categoriesUpserted: 3, productsCreated: 5, productsUpdated: 0, unnamedFamilies: ['F3'] });

    const fallback = await prisma.category.findUnique({ where: { code: 'F3' } });
    expect(fallback?.name).toBe('Familia F3');
    const board = await prisma.product.findUnique({ where: { sku: 'IT-1' } });
    expect(Number(board?.pricePerUnit)).toBe(20);
    expect(Number(board?.pricePerM2)).toBe(10);
    const strip = await prisma.product.findUnique({ where: { sku: 'IT-3' } });
    expect(strip?.lengthCm).toBe(240);
  });

  it('is idempotent on a second run', async () => {
    await importCatalog(prisma, items(), families);
    const second = await importCatalog(prisma, items(), families);
    expect(second.productsCreated).toBe(0);
    expect(second.productsUpdated).toBe(5);
    expect(await prisma.product.count()).toBe(5);
    expect(await prisma.category.count()).toBe(3);
  });

  it('updates a changed price', async () => {
    await importCatalog(prisma, items(), families);
    const changed = items();
    changed[1] = { ...changed[1], price: 4.25 };
    const result = await importCatalog(prisma, changed, families);
    expect(result.productsCreated).toBe(0);
    const piece = await prisma.product.findUnique({ where: { sku: 'IT-2' } });
    expect(Number(piece?.pricePerUnit)).toBe(4.25);
  });

  it('fails before writing products when a category name collides with another code', async () => {
    await prisma.category.create({ data: { name: 'Family One', code: 'OTHER' } });
    await expect(importCatalog(prisma, items(), families)).rejects.toThrow(/Family One/);
    expect(await prisma.product.count()).toBe(0);
  });

  it('processes products across several batches', async () => {
    const result = await importCatalog(prisma, items(), families, { batchSize: 2 });
    expect(result.productsCreated).toBe(5);
    expect(await prisma.product.count()).toBe(5);
    const again = await importCatalog(prisma, items(), families, { batchSize: 2 });
    expect(again).toMatchObject({ productsCreated: 0, productsUpdated: 5 });
  });
});
