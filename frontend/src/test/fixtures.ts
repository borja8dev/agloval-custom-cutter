import type {
  CatalogProduct,
  OrderQuote,
  QuoteGroup,
  OrderLine
} from '../types';

export function makeProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: 'p_m2',
    sku: 'MEL-0001',
    name: 'Melamina Blanca 244x122',
    unit: 'M2',
    familyCode: 'MEL',
    familyName: 'Melamina',
    categoryName: 'Melamina',
    standardWidth: 244,
    standardHeight: 122,
    thickness: 16,
    lengthCm: null,
    pricePerUnit: 46.14,
    pricePerM2: 15.5,
    currency: 'EUR',
    ...overrides
  };
}

export const m2Product = makeProduct();

export const udProduct = makeProduct({
  id: 'p_ud',
  sku: 'FER-0012',
  name: 'Tornillo',
  unit: 'UD',
  familyCode: 'FER',
  familyName: 'Ferreteria',
  categoryName: 'Ferreteria',
  standardWidth: null,
  standardHeight: null,
  thickness: null,
  pricePerUnit: 0.35,
  pricePerM2: null
});

export const mlProduct = makeProduct({
  id: 'p_ml',
  sku: 'PER-0003',
  name: 'Perfil 2.4 m',
  unit: 'ML',
  familyCode: 'PER',
  familyName: 'Perfiles',
  categoryName: 'Perfiles',
  standardWidth: null,
  standardHeight: null,
  thickness: null,
  lengthCm: 240,
  pricePerUnit: 5,
  pricePerM2: null
});

export function makeQuote(overrides: Partial<OrderQuote> = {}): OrderQuote {
  const groups: QuoteGroup[] = [
    {
      kind: 'UNIT',
      product: {
        id: 'p_ud',
        sku: 'FER-0012',
        name: 'Tornillo',
        unit: 'UD',
        familyCode: 'FER',
        familyName: 'Ferreteria',
        thickness: null,
        boardWidth: null,
        boardHeight: null,
        lengthCm: null
      },
      quantity: 12,
      unitPrice: 0.35,
      price: 4.2
    }
  ];
  return {
    groups,
    total: 4.2,
    currency: 'EUR',
    calculatedAt: '2026-10-09T10:00:00.000Z',
    ...overrides
  };
}

export const sampleLines: OrderLine[] = [
  { id: 'l1', product: m2Product, pieces: [{ width: 100, height: 80, quantity: 2 }] },
  { id: 'l2', product: udProduct, quantity: 12 }
];
