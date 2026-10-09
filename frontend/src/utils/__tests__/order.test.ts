import { describe, expect, test } from 'vitest';
import {
  addPiece,
  addQuantity,
  updatePiece,
  removePiece,
  updateQuantity,
  removeLine,
  countsByProduct,
  toQuoteRequest,
  isBoardLine
} from '../order';
import type { OrderLine } from '../../types';
import { m2Product, udProduct, mlProduct } from '../../test/fixtures';

let n = 0;
const genId = () => `id_${++n}`;

describe('order helpers', () => {
  test('addPiece creates the M2 line when missing', () => {
    const lines = addPiece([], m2Product, { width: 100, height: 80, quantity: 2 }, genId);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      product: m2Product,
      pieces: [{ width: 100, height: 80, quantity: 2 }]
    });
  });

  test('addPiece merges identical pieces by summing quantity', () => {
    let lines = addPiece([], m2Product, { width: 100, height: 80, quantity: 2 }, genId);
    lines = addPiece(lines, m2Product, { width: 100, height: 80, quantity: 3 }, genId);
    expect(lines).toHaveLength(1);
    expect((lines[0] as { pieces: unknown[] }).pieces).toEqual([
      { width: 100, height: 80, quantity: 5 }
    ]);
  });

  test('addPiece keeps different pieces apart and reuses the product line', () => {
    let lines = addPiece([], m2Product, { width: 100, height: 80, quantity: 1 }, genId);
    lines = addPiece(lines, m2Product, { width: 50, height: 30, quantity: 1 }, genId);
    expect(lines).toHaveLength(1);
    expect(isBoardLine(lines[0]) && lines[0].pieces).toHaveLength(2);
  });

  test('addPiece does not mutate its input', () => {
    const before = addPiece([], m2Product, { width: 1, height: 1, quantity: 1 }, genId);
    const snapshot = JSON.stringify(before);
    addPiece(before, m2Product, { width: 1, height: 1, quantity: 4 }, genId);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  test('addQuantity creates a line and adds to the existing line of the same product', () => {
    let lines = addQuantity([], udProduct, 12, genId);
    lines = addQuantity(lines, udProduct, 8, genId);
    lines = addQuantity(lines, mlProduct, 3, genId);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ product: udProduct, quantity: 20 });
    expect(lines[1]).toMatchObject({ product: mlProduct, quantity: 3 });
  });

  test('updatePiece replaces the piece at the index and merges with an equal one', () => {
    const start: OrderLine[] = [
      {
        id: 'a',
        product: m2Product,
        pieces: [
          { width: 10, height: 20, quantity: 1 },
          { width: 30, height: 40, quantity: 2 }
        ]
      }
    ];
    const edited = updatePiece(start, 'a', 1, { width: 10, height: 20, quantity: 4 });
    expect(isBoardLine(edited[0]) && edited[0].pieces).toEqual([
      { width: 10, height: 20, quantity: 5 }
    ]);
  });

  test('updatePiece ignores unknown lines and out-of-range indexes', () => {
    const start: OrderLine[] = [
      { id: 'a', product: m2Product, pieces: [{ width: 10, height: 20, quantity: 1 }] }
    ];
    expect(updatePiece(start, 'zzz', 0, { width: 1, height: 1, quantity: 1 })).toEqual(start);
    expect(updatePiece(start, 'a', 5, { width: 1, height: 1, quantity: 1 })).toEqual(start);
  });

  test('removePiece removes the whole M2 line when the last piece goes', () => {
    const start: OrderLine[] = [
      {
        id: 'a',
        product: m2Product,
        pieces: [
          { width: 10, height: 20, quantity: 1 },
          { width: 30, height: 40, quantity: 2 }
        ]
      },
      { id: 'b', product: udProduct, quantity: 2 }
    ];
    const one = removePiece(start, 'a', 0);
    expect(isBoardLine(one[0]) && one[0].pieces).toEqual([{ width: 30, height: 40, quantity: 2 }]);
    const none = removePiece(one, 'a', 0);
    expect(none.map((l) => l.id)).toEqual(['b']);
  });

  test('updateQuantity sets the quantity and removes the line at zero', () => {
    const start: OrderLine[] = [{ id: 'b', product: udProduct, quantity: 2 }];
    expect(updateQuantity(start, 'b', 7)).toEqual([{ id: 'b', product: udProduct, quantity: 7 }]);
    expect(updateQuantity(start, 'b', 0)).toEqual([]);
  });

  test('updateQuantity does not touch M2 lines', () => {
    const start: OrderLine[] = [
      { id: 'a', product: m2Product, pieces: [{ width: 1, height: 1, quantity: 1 }] }
    ];
    expect(updateQuantity(start, 'a', 9)).toEqual(start);
  });

  test('removeLine drops the line by id', () => {
    const start: OrderLine[] = [
      { id: 'a', product: udProduct, quantity: 1 },
      { id: 'b', product: mlProduct, quantity: 1 }
    ];
    expect(removeLine(start, 'a').map((l) => l.id)).toEqual(['b']);
  });

  test('countsByProduct sums piece quantities for M2 and quantity for UD/ML', () => {
    const lines: OrderLine[] = [
      {
        id: 'a',
        product: m2Product,
        pieces: [
          { width: 10, height: 20, quantity: 3 },
          { width: 30, height: 40, quantity: 2 }
        ]
      },
      { id: 'b', product: udProduct, quantity: 12 },
      { id: 'c', product: mlProduct, quantity: 4 }
    ];
    expect(countsByProduct(lines)).toEqual({ p_m2: 5, p_ud: 12, p_ml: 4 });
    expect(countsByProduct([])).toEqual({});
  });

  test('toQuoteRequest builds the API payload', () => {
    const lines: OrderLine[] = [
      { id: 'a', product: m2Product, pieces: [{ width: 100, height: 80, quantity: 20 }] },
      { id: 'b', product: udProduct, quantity: 12 }
    ];
    expect(toQuoteRequest(lines)).toEqual({
      lines: [
        { productId: 'p_m2', pieces: [{ width: 100, height: 80, quantity: 20 }] },
        { productId: 'p_ud', quantity: 12 }
      ]
    });
    expect(toQuoteRequest([])).toEqual({ lines: [] });
  });
});
