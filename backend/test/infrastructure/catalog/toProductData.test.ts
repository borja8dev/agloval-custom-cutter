import { toProductData } from '../../../src/infrastructure/catalog/toProductData';
import { CatalogItem } from '../../../src/infrastructure/catalog/catalogTypes';

const base = { sku: 'T-1', familyCode: '99', name: 'Test item', rawDescription: '% Test item' };

describe('toProductData', () => {
  it('maps an M2 board: price per m2, derived whole-board price and dimensions', () => {
    const item: CatalogItem = { ...base, unit: 'M2', price: 13.16, widthCm: 244, heightCm: 122, thicknessMm: 16 };
    expect(toProductData(item, 'cat-1')).toEqual({
      sku: 'T-1',
      unit: 'M2',
      name: 'Test item',
      description: '% Test item',
      categoryId: 'cat-1',
      standardWidth: 244,
      standardHeight: 122,
      thickness: 16,
      lengthCm: null,
      pricePerUnit: 39.17,
      pricePerM2: 13.16,
      currency: 'EUR'
    });
  });

  it('stores a null thickness when the M2 item has none', () => {
    const item: CatalogItem = { ...base, unit: 'M2', price: 10, widthCm: 100, heightCm: 100 };
    const data = toProductData(item, 'c');
    expect(data.thickness).toBeNull();
    expect(data.pricePerUnit).toBe(10);
  });

  it('maps UD with no dimensions and no per-m2 price', () => {
    const item: CatalogItem = { ...base, unit: 'UD', price: 4.5 };
    const data = toProductData(item, 'c');
    expect(data).toMatchObject({
      unit: 'UD',
      pricePerUnit: 4.5,
      pricePerM2: null,
      standardWidth: null,
      standardHeight: null,
      thickness: null,
      lengthCm: null
    });
  });

  it('maps ML keeping the per-metre price and the fixed length', () => {
    const item: CatalogItem = { ...base, unit: 'ML', price: 2.35, lengthCm: 240 };
    const data = toProductData(item, 'c');
    expect(data).toMatchObject({
      unit: 'ML',
      pricePerUnit: 2.35,
      lengthCm: 240,
      pricePerM2: null,
      standardWidth: null,
      standardHeight: null
    });
  });

  it('avoids float drift when deriving the board price', () => {
    // 0.07 * 1 m2 would be 0.07000000000000001 with naive float math in some cases
    const item: CatalogItem = { ...base, unit: 'M2', price: 1.1, widthCm: 300, heightCm: 100 };
    expect(toProductData(item, 'c').pricePerUnit).toBe(3.3);
    const item2: CatalogItem = { ...base, unit: 'M2', price: 0.29, widthCm: 100, heightCm: 100 };
    expect(toProductData(item2, 'c').pricePerUnit).toBe(0.29);
  });
});
