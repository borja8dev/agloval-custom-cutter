import { describe, expect, test, vi, beforeEach } from 'vitest';
import {
  exportToPDF,
  shareViaWhatsApp,
  shareViaEmail,
  generateShareUrl
} from '../export';
import { CalculationResponse } from '../../types';

const mockCalculation: CalculationResponse = {
  id: 'calc_1',
  product: { id: 'prod_1', name: 'OSB Ligero 244x122', categoryName: 'OSB' },
  board: { width: 244, height: 122, thickness: 12, area: 2.9768 },
  requestedPieces: [{ width: 100, height: 80 }],
  calculation: {
    totalAreaNeeded: 0.8,
    boardsNeeded: 0.3,
    wastePercentage: 10,
    pieceCount: 1,
    averagePieceSize: 0.8
  },
  pricing: { pricePerBoard: 45, boardsNeeded: 0.3, totalPrice: 13.5, currency: 'EUR' },
  metadata: { calculatedAt: new Date().toISOString(), status: 'DRAFT' }
};

describe('export service', () => {
  describe('generateShareUrl()', () => {
    test('should build a URL with the calculation id as a query param', () => {
      const url = generateShareUrl('calc_1');
      expect(url).toBe(`${window.location.origin}?calc=calc_1`);
    });
  });

  describe('exportToPDF()', () => {
    test('should reject since jsPDF is not installed yet', async () => {
      await expect(exportToPDF(mockCalculation)).rejects.toThrow(/jsPDF/);
    });
  });

  describe('shareViaWhatsApp()', () => {
    test('should open a wa.me URL containing the product name and total price', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      shareViaWhatsApp(mockCalculation, 'https://example.com?calc=calc_1');

      expect(openSpy).toHaveBeenCalledTimes(1);
      const [url, target] = openSpy.mock.calls[0];
      expect(url as string).toContain('https://wa.me/?text=');
      expect(target).toBe('_blank');

      const decoded = decodeURIComponent((url as string).split('text=')[1]);
      expect(decoded).toContain('OSB Ligero 244x122');
      expect(decoded).toContain('13.50');
      expect(decoded).toContain('https://example.com?calc=calc_1');

      openSpy.mockRestore();
    });
  });

  describe('shareViaEmail()', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { ...window.location, href: '' },
        writable: true,
        configurable: true
      });
    });

    test('should set location.href to a mailto: URL with subject and body', () => {
      shareViaEmail(mockCalculation, 'https://example.com?calc=calc_1');

      expect(window.location.href).toContain('mailto:?subject=');

      const [, query] = window.location.href.split('?');
      const params = new URLSearchParams(query);
      const body = decodeURIComponent(params.get('body') || '');

      expect(decodeURIComponent(params.get('subject') || '')).toContain(
        'OSB Ligero 244x122'
      );
      expect(body).toContain('13.50');
      expect(body).toContain('https://example.com?calc=calc_1');
    });
  });
});
