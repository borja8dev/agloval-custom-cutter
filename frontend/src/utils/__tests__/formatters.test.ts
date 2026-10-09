import { describe, expect, test } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatArea,
  formatDimensions,
  formatWaste,
  formatTimeAgo,
  formatDecimal,
  unitLabel,
  formatProductMeasure,
  formatProductPrice,
} from '../formatters';
import { makeProduct, m2Product, udProduct, mlProduct } from '../../test/fixtures';

describe('Formatters', () => {
  describe('formatCurrency()', () => {
    test('should format a whole number as EUR currency', () => {
      expect(formatCurrency(100)).toBe('€100.00');
    });

    test('should format decimals', () => {
      expect(formatCurrency(95.5)).toBe('€95.50');
    });
  });

  describe('formatNumber()', () => {
    test('should format with decimals', () => {
      expect(formatNumber(95.567, 2)).toBe('95.57');
    });
  });

  describe('formatArea()', () => {
    test('should format area with m²', () => {
      const result = formatArea(0.6);
      expect(result).toContain('0.60');
      expect(result).toContain('m²');
    });
  });

  describe('formatDimensions()', () => {
    test('should format dimensions', () => {
      expect(formatDimensions(300, 200)).toBe('300 × 200 cm');
    });
  });

  describe('formatWaste()', () => {
    test('should rate low waste', () => {
      const result = formatWaste(15);
      expect(result.level).toBe('low');
      expect(result.text).toContain('excelente');
    });

    test('should rate medium waste', () => {
      const result = formatWaste(35);
      expect(result.level).toBe('medium');
      expect(result.text).toContain('bueno');
    });

    test('should rate high waste', () => {
      const result = formatWaste(75);
      expect(result.level).toBe('high');
      expect(result.text).toContain('alto');
    });
  });

  describe('formatTimeAgo()', () => {
    test('should show "Hace poco" for recent dates', () => {
      const now = new Date();
      expect(formatTimeAgo(now)).toBe('Hace poco');
    });

    test('should show minutes ago', () => {
      const date = new Date(Date.now() - 30 * 60000);
      expect(formatTimeAgo(date)).toContain('30m');
    });
  });

  describe('formatDecimal()', () => {
    test('uses a decimal comma with fixed decimals', () => {
      expect(formatDecimal(13.156)).toBe('13,16');
      expect(formatDecimal(5)).toBe('5,00');
      expect(formatDecimal(2.4, 1)).toBe('2,4');
    });
  });

  describe('unitLabel()', () => {
    test('maps units to Spanish labels', () => {
      expect(unitLabel('M2')).toBe('Tablero');
      expect(unitLabel('UD')).toBe('Unidad');
      expect(unitLabel('ML')).toBe('Barra');
    });
  });

  describe('formatProductMeasure()', () => {
    test('formats board size and thickness for M2', () => {
      expect(formatProductMeasure(m2Product)).toBe('244 x 122 cm · 16 mm');
    });

    test('omits thickness when missing', () => {
      expect(formatProductMeasure(makeProduct({ thickness: null }))).toBe('244 x 122 cm');
    });

    test('formats length in metres for ML', () => {
      expect(formatProductMeasure(mlProduct)).toBe('2,40 m');
    });

    test('is empty for UD', () => {
      expect(formatProductMeasure(udProduct)).toBe('');
    });
  });

  describe('formatProductPrice()', () => {
    test('uses price per m2 for M2', () => {
      expect(formatProductPrice(makeProduct({ pricePerM2: 13.16 }))).toBe('13,16 EUR/m2');
    });

    test('falls back to price per board when pricePerM2 is null', () => {
      expect(formatProductPrice(makeProduct({ pricePerM2: null, pricePerUnit: 46.14 }))).toBe(
        '46,14 EUR/tablero'
      );
    });

    test('formats UD per unit', () => {
      expect(formatProductPrice(makeProduct({ ...udProduct, pricePerUnit: 1.82 }))).toBe(
        '1,82 EUR/ud'
      );
    });

    test('formats ML per metre', () => {
      expect(formatProductPrice(makeProduct({ ...mlProduct, pricePerUnit: 12.64 }))).toBe(
        '12,64 EUR/m'
      );
    });
  });
});
