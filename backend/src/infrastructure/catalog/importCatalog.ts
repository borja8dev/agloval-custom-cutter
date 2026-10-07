import { PrismaClient } from '@prisma/client';
import { CatalogItem } from './catalogTypes';
import { toProductData } from './toProductData';

export interface ImportResult {
  categoriesUpserted: number;
  productsCreated: number;
  productsUpdated: number;
  unnamedFamilies: string[];
}

export interface ImportOptions {
  batchSize?: number;
}

const DEFAULT_BATCH_SIZE = 500;

async function upsertCategories(
  prisma: PrismaClient,
  codes: string[],
  familyNames: Record<string, string>
): Promise<{ ids: Map<string, string>; unnamed: string[] }> {
  const unnamed = codes.filter((code) => !familyNames[code]);
  const nameOf = (code: string): string => familyNames[code] ?? `Familia ${code}`;

  // Category.name is unique: refuse a name already held by a different code.
  const existing = await prisma.category.findMany({
    where: { name: { in: codes.map(nameOf) } }
  });
  for (const code of codes) {
    const clash = existing.find((c) => c.name === nameOf(code) && c.code !== code);
    if (clash) {
      throw new Error(
        `Category name "${nameOf(code)}" for family "${code}" already belongs to family "${clash.code}"`
      );
    }
  }

  const ids = new Map<string, string>();
  for (const code of codes) {
    const category = await prisma.category.upsert({
      where: { code },
      create: { code, name: nameOf(code) },
      update: { name: nameOf(code) }
    });
    ids.set(code, category.id);
  }
  return { ids, unnamed };
}

export async function importCatalog(
  prisma: PrismaClient,
  items: CatalogItem[],
  familyNames: Record<string, string>,
  opts: ImportOptions = {}
): Promise<ImportResult> {
  const batchSize = opts.batchSize ?? DEFAULT_BATCH_SIZE;
  const codes = [...new Set(items.map((item) => item.familyCode))].sort();
  const { ids, unnamed } = await upsertCategories(prisma, codes, familyNames);

  let productsCreated = 0;
  let productsUpdated = 0;

  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize);
    const existing = await prisma.product.findMany({
      where: { sku: { in: batch.map((item) => item.sku) } },
      select: { sku: true }
    });
    const existingSkus = new Set(existing.map((p) => p.sku));

    await prisma.$transaction(
      batch.map((item) => {
        const data = toProductData(item, ids.get(item.familyCode) as string);
        return prisma.product.upsert({ where: { sku: item.sku }, create: data, update: data });
      })
    );

    const updated = batch.filter((item) => existingSkus.has(item.sku)).length;
    productsUpdated += updated;
    productsCreated += batch.length - updated;
  }

  return { categoriesUpserted: codes.length, productsCreated, productsUpdated, unnamedFamilies: unnamed };
}
