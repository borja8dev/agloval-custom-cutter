import { describe, expect, test, vi } from 'vitest';
import { reorderFromHistory } from '../reorder';
import { appendOrder, EMPTY_HISTORY } from '../../utils/orderHistory';
import { makeProduct, makeQuote, sampleLines, m2Product, udProduct } from '../../test/fixtures';
import { isBoardLine } from '../../utils/order';

const entry = appendOrder(EMPTY_HISTORY, makeQuote(), sampleLines).orders[0];

describe('reorderFromHistory', () => {
  test('rebuilds lines with the current product objects', async () => {
    const repriced = makeProduct({ pricePerM2: 99 });
    const fetchProduct = vi.fn(async (id: string) => (id === 'p_m2' ? repriced : udProduct));
    const { lines, missing } = await reorderFromHistory(entry, fetchProduct);
    expect(missing).toEqual([]);
    expect(lines).toHaveLength(2);
    expect(lines[0].product).toBe(repriced);
    expect(isBoardLine(lines[0]) && lines[0].pieces).toEqual([{ width: 100, height: 80, quantity: 2 }]);
    expect(lines[1]).toMatchObject({ product: udProduct, quantity: 12 });
    expect(new Set(lines.map((l) => l.id)).size).toBe(2);
  });

  test('reports missing products by name and keeps the rest', async () => {
    const fetchProduct = vi.fn(async (id: string) => {
      if (id === 'p_ud') throw new Error('Product not found');
      return m2Product;
    });
    const { lines, missing } = await reorderFromHistory(entry, fetchProduct);
    expect(missing).toEqual(['Tornillo']);
    expect(lines.map((l) => l.product.id)).toEqual(['p_m2']);
  });

  test('a product whose unit changed is reported as missing', async () => {
    const fetchProduct = vi.fn(async () => makeProduct({ id: 'p_ud', unit: 'ML', lengthCm: 100 }));
    const { lines, missing } = await reorderFromHistory(
      { ...entry, lines: [entry.lines[1]] },
      fetchProduct
    );
    expect(lines).toEqual([]);
    expect(missing).toEqual(['Tornillo']);
  });

  test('fetches each distinct product once', async () => {
    const fetchProduct = vi.fn(async () => m2Product);
    await reorderFromHistory({ ...entry, lines: [entry.lines[0], entry.lines[0]] }, fetchProduct);
    expect(fetchProduct).toHaveBeenCalledTimes(1);
  });
});
