import { priceUsedArea } from '../../src/domain/services/BoardPricing';

// 1 m2 = 10,000 cm2. A 100 x 100 piece is exactly 1 m2.
const square = (quantity = 1) => ({ width: 100, height: 100, quantity });

describe('priceUsedArea', () => {
  test('bills the used area at pricePerM2, not whole boards', () => {
    // 3 m2 used on a 6 m2 board at 10 EUR/m2 -> 30 EUR (half a board is not billed as a board)
    const result = priceUsedArea({
      pieces: [square(3)],
      boardAreaM2: 6,
      pricePerM2: 10,
      pricePerUnit: 999,
    });
    expect(result.totalPrice).toBe(30);
    expect(result.pricePerM2).toBe(10);
    expect(result.pricePerBoard).toBe(60);
  });

  test('prices an exact area with awkward decimals', () => {
    // 16.00 m2 x 14.36 = 229.76
    const result = priceUsedArea({
      pieces: [{ width: 400, height: 100, quantity: 4 }],
      boardAreaM2: 5.985,
      pricePerM2: 14.36,
      pricePerUnit: 0,
    });
    expect(result.totalPrice).toBe(229.76);
  });

  test('rounds once at the end, not per piece', () => {
    // each piece: 33.33 x 33.33 cm = 0.11108889 m2 x 12.34 = 1.3709 EUR (1.37 rounded per piece)
    // 10 pieces: 13.7085... -> 13.71, while 10 x 1.37 would be 13.70
    const result = priceUsedArea({
      pieces: [{ width: 33.33, height: 33.33, quantity: 10 }],
      boardAreaM2: 6,
      pricePerM2: 12.34,
      pricePerUnit: 0,
    });
    expect(result.totalPrice).toBe(13.71);
  });

  test('avoids floating point drift on exact cents', () => {
    // 3 m2 x 1.15 = 3.45 exactly
    const result = priceUsedArea({
      pieces: [square(3)],
      boardAreaM2: 6,
      pricePerM2: 1.15,
      pricePerUnit: 0,
    });
    expect(result.totalPrice).toBe(3.45);
  });

  test('rounds the whole-board informational price once to 2 decimals', () => {
    // 3.66 m2 x 12.34 = 45.1644 -> 45.16
    const result = priceUsedArea({
      pieces: [square()],
      boardAreaM2: 3.66,
      pricePerM2: 12.34,
      pricePerUnit: 0,
    });
    expect(result.pricePerBoard).toBe(45.16);
  });

  test('treats a missing quantity as 1', () => {
    const result = priceUsedArea({
      pieces: [{ width: 100, height: 100 }],
      boardAreaM2: 6,
      pricePerM2: 10,
      pricePerUnit: 0,
    });
    expect(result.totalPrice).toBe(10);
  });

  test('derives the m2 price from pricePerUnit / board area when pricePerM2 is null (legacy rows)', () => {
    // 95.50 EUR per 6 m2 board -> 15.9166.. EUR/m2; 3 m2 used -> 47.75
    const result = priceUsedArea({
      pieces: [square(3)],
      boardAreaM2: 6,
      pricePerM2: null,
      pricePerUnit: 95.5,
    });
    expect(result.totalPrice).toBe(47.75);
    expect(result.pricePerM2).toBe(15.92);
    expect(result.pricePerBoard).toBe(95.5);
  });

  test('the price does not depend on how many boards the area needs', () => {
    // 5.9 m2 fits one 6 m2 board, 6.1 m2 needs two: price is linear in the area either way
    const input = { boardAreaM2: 6, pricePerM2: 10, pricePerUnit: 0 };
    const one = priceUsedArea({ ...input, pieces: [{ width: 590, height: 100 }] });
    const two = priceUsedArea({ ...input, pieces: [{ width: 610, height: 100 }] });
    expect(one.totalPrice).toBe(59);
    expect(two.totalPrice).toBe(61);
  });
});
