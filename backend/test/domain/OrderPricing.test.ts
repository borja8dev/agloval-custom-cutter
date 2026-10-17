import { unitLineCents, linearLineCents } from '../../src/domain/services/OrderPricing';

describe('OrderPricing', () => {
  describe('unitLineCents()', () => {
    test('multiplies the unit price by the quantity, in integer cents', () => {
      expect(unitLineCents(2.5, 12)).toBe(3000);
    });

    test('has no float drift for awkward prices', () => {
      // 0.1 * 3 === 0.30000000000000004 in floating point
      expect(unitLineCents(0.1, 3)).toBe(30);
      expect(unitLineCents(1.15, 100000)).toBe(11500000);
    });
  });

  describe('linearLineCents()', () => {
    test('prices the bar length in metres times the quantity', () => {
      // 3 bars x 2.4 m x 5.00 EUR/m = 36.00 EUR
      expect(linearLineCents(5, 240, 3)).toBe(3600);
    });

    test('rounds once per group, not per bar', () => {
      // 1.37 EUR/m x 2.4 m = 3.288 per bar; 3 bars = 9.864 -> 9.86
      expect(linearLineCents(1.37, 240, 3)).toBe(986);
      // per-bar rounding would give 3 x 3.29 = 9.87
    });

    test('rounds half cents up', () => {
      // 0.5 EUR/m x 0.01 m... 10 cm bar at 1.05 EUR/m = 0.105 -> 0.11
      expect(linearLineCents(1.05, 10, 1)).toBe(11);
    });

    test('handles a single awkward price without drift', () => {
      expect(linearLineCents(0.1, 300, 1)).toBe(30);
      expect(linearLineCents(19.99, 100, 7)).toBe(13993);
    });
  });
});
