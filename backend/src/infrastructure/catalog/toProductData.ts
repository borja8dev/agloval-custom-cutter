import { CatalogItem, CatalogUnit } from './catalogTypes';

export interface ProductData {
  sku: string;
  unit: CatalogUnit;
  name: string;
  description: string;
  categoryId: string;
  standardWidth: number | null;
  standardHeight: number | null;
  thickness: number | null;
  lengthCm: number | null;
  pricePerUnit: number;
  pricePerM2: number | null;
  currency: 'EUR';
}

const toCents = (euros: number): number => Math.round(euros * 100);
const fromCents = (cents: number): number => Number((cents / 100).toFixed(2));

/**
 * Maps a parsed tariff row to the Product columns.
 * M2: pricePerM2 is the tariff price, pricePerUnit the derived whole-board price.
 * UD: pricePerUnit only. ML: pricePerUnit is the price PER METRE, lengthCm the fixed length.
 */
export function toProductData(item: CatalogItem, categoryId: string): ProductData {
  const data: ProductData = {
    sku: item.sku,
    unit: item.unit,
    name: item.name,
    description: item.rawDescription,
    categoryId,
    standardWidth: null,
    standardHeight: null,
    thickness: null,
    lengthCm: null,
    pricePerUnit: fromCents(toCents(item.price)),
    pricePerM2: null,
    currency: 'EUR'
  };

  if (item.unit === 'M2') {
    const width = item.widthCm ?? 0;
    const height = item.heightCm ?? 0;
    // cents * cm * cm is an exact integer; dividing by 10000 cm2/m2 gives cents.
    data.pricePerUnit = fromCents(Math.round((toCents(item.price) * width * height) / 10000));
    data.pricePerM2 = fromCents(toCents(item.price));
    data.standardWidth = width;
    data.standardHeight = height;
    data.thickness = item.thicknessMm ?? null;
  } else if (item.unit === 'ML') {
    data.lengthCm = item.lengthCm ?? null;
  }

  return data;
}
