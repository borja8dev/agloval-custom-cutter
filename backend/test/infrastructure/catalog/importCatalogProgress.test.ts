import { PrismaClient } from '@prisma/client';
import { importCatalog, ImportProgress } from '../../../src/infrastructure/catalog/importCatalog';
import { CatalogItem } from '../../../src/infrastructure/catalog/catalogTypes';

const items: CatalogItem[] = [
  { sku: 'P-1', familyCode: 'F1', name: 'Piece 1', rawDescription: 'Piece 1', unit: 'UD', price: 1 },
  { sku: 'P-2', familyCode: 'F1', name: 'Piece 2', rawDescription: 'Piece 2', unit: 'UD', price: 2 },
  { sku: 'P-3', familyCode: 'F1', name: 'Piece 3', rawDescription: 'Piece 3', unit: 'UD', price: 3 }
];

/** In-memory stand-in: the second transaction fails when failOnBatch is 2. */
function fakePrisma(failOnBatch?: number): PrismaClient {
  let batch = 0;
  return {
    category: {
      findMany: async () => [],
      upsert: async ({ where }: { where: { code: string } }) => ({ id: `cat-${where.code}` })
    },
    product: {
      findMany: async () => [],
      upsert: (args: unknown) => args
    },
    $transaction: async () => {
      batch += 1;
      if (batch === failOnBatch) throw new Error('connection dropped');
      return [];
    }
  } as unknown as PrismaClient;
}

describe('importCatalog progress reporting', () => {
  it('reports cumulative counts after every committed batch', async () => {
    const seen: ImportProgress[] = [];

    await importCatalog(fakePrisma(), items, { F1: 'Family One' }, {
      batchSize: 2,
      onProgress: (progress) => seen.push({ ...progress })
    });

    expect(seen).toEqual([
      { categoriesUpserted: 1, productsCreated: 2, productsUpdated: 0 },
      { categoriesUpserted: 1, productsCreated: 3, productsUpdated: 0 }
    ]);
  });

  it('has already reported the committed batches when a later batch fails', async () => {
    const seen: ImportProgress[] = [];

    await expect(
      importCatalog(fakePrisma(2), items, { F1: 'Family One' }, {
        batchSize: 1,
        onProgress: (progress) => seen.push({ ...progress })
      })
    ).rejects.toThrow('connection dropped');

    expect(seen).toEqual([{ categoriesUpserted: 1, productsCreated: 1, productsUpdated: 0 }]);
  });
});
