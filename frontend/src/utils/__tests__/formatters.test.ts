import { describe, expect, test } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatArea,
  formatDimensions,
  formatWaste,
  formatTimeAgo
} from '../formatters';

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
});
