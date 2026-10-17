import { priceBoards } from '../../src/domain/services/BoardPricing';

describe('priceBoards', () => {
  test('bills whole boards at pricePerM2 x board area', () => {
    // 6 m2 board at 10 EUR/m2 -> 60 EUR per board
    const result = priceBoards({ boards: 2, boardAreaM2: 6, pricePerM2: 10, pricePerUnit: 999 });
    expect(result.pricePerBoard).toBe(60);
    expect(result.totalPrice).toBe(120);
  });

  test('rounds the whole-board price snapshot to 2 decimals', () => {
    // 3.66 m2 x 12.34 = 45.1644 -> 45.16
    const result = priceBoards({
      boards: 1,
      boardAreaM2: 3.66,
      pricePerM2: 12.34,
      pricePerUnit: 0,
    });
    expect(result.pricePerBoard).toBe(45.16);
    expect(result.totalPrice).toBe(45.16);
  });

  test('rounds the total once, not per factor', () => {
    // 3 x 3.66 x 12.34 = 135.4932 -> 135.49 (3 x rounded board price would be 135.48)
    const result = priceBoards({
      boards: 3,
      boardAreaM2: 3.66,
      pricePerM2: 12.34,
      pricePerUnit: 0,
    });
    expect(result.pricePerBoard).toBe(45.16);
    expect(result.totalPrice).toBe(135.49);
  });

  test('avoids floating point drift on exact cents', () => {
    // 3 x 6 x 12.345 style drift: 18 x 1.15 = 20.7 exactly in cents
    const result = priceBoards({ boards: 3, boardAreaM2: 6, pricePerM2: 1.15, pricePerUnit: 0 });
    expect(result.totalPrice).toBe(20.7);
  });

  test('falls back to boards x pricePerUnit when pricePerM2 is null (legacy rows)', () => {
    const result = priceBoards({ boards: 2, boardAreaM2: 6, pricePerM2: null, pricePerUnit: 95.5 });
    expect(result.pricePerBoard).toBe(95.5);
    expect(result.totalPrice).toBe(191);
  });
});
