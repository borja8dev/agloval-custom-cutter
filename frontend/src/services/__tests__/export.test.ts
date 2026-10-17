import { describe, expect, test, vi, beforeEach } from 'vitest';
import { buildOrderText, exportToPDF, shareViaWhatsApp, shareViaEmail } from '../export';
import type { OrderQuote, QuoteGroup } from '../../types';
import { makeQuote, m2Product } from '../../test/fixtures';

const boardGroup: QuoteGroup = {
  kind: 'BOARD',
  product: {
    id: m2Product.id,
    sku: m2Product.sku,
    name: 'Melamina Blanca 244x122',
    unit: 'M2',
    familyCode: 'MEL',
    familyName: 'Melamina',
    thickness: 16,
    boardWidth: 244,
    boardHeight: 122,
    lengthCm: null
  },
  pieces: [{ width: 100, height: 80, quantity: 5 }],
  pieceCount: 5,
  usedAreaM2: 4,
  boardAreaM2: 2.9768,
  boardsNeeded: 2,
  pricePerM2: 15.5,
  pricePerBoard: 46.14,
  price: 92.28
};

const linearGroup: QuoteGroup = {
  kind: 'LINEAR',
  product: {
    id: 'p_ml',
    sku: 'PER-0003',
    name: 'Perfil 2.4 m',
    unit: 'ML',
    familyCode: 'PER',
    familyName: 'Perfiles',
    thickness: null,
    boardWidth: null,
    boardHeight: null,
    lengthCm: 240
  },
  quantity: 3,
  lengthM: 2.4,
  pricePerMeter: 5,
  price: 36
};

const quote: OrderQuote = makeQuote({
  groups: [boardGroup, ...makeQuote().groups, linearGroup],
  total: 132.48
});

describe('export service', () => {
  describe('buildOrderText()', () => {
    test('lists every group by product name with its price and the total', () => {
      const text = buildOrderText(quote);
      expect(text).toContain('Melamina Blanca 244x122');
      expect(text).toContain('4,00 m² usados · 2 tableros de 244 x 122 cm');
      expect(text).toContain('2 tableros x 46,14 EUR = 92,28 EUR');
      expect(text).toContain('Tornillo');
      expect(text).toContain('12 x 0,35 EUR');
      expect(text).toContain('Perfil 2.4 m');
      expect(text).toContain('3 barras');
      expect(text).toContain('Total: 132,48 EUR');
    });

    test('never mentions waste or utilisation', () => {
      expect(buildOrderText(quote)).not.toMatch(/desperdicio|aprovechamiento|utilizaci/i);
    });
  });

  describe('exportToPDF()', () => {
    test('should reject since jsPDF is not installed yet', async () => {
      await expect(exportToPDF(quote)).rejects.toThrow(/jsPDF/);
    });
  });

  describe('shareViaWhatsApp()', () => {
    test('should open a wa.me URL containing the order summary', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      shareViaWhatsApp(quote);

      expect(openSpy).toHaveBeenCalledTimes(1);
      const [url, target] = openSpy.mock.calls[0];
      expect(url as string).toContain('https://wa.me/?text=');
      expect(target).toBe('_blank');

      const decoded = decodeURIComponent((url as string).split('text=')[1]);
      expect(decoded).toContain('Melamina Blanca 244x122');
      expect(decoded).toContain('Total: 132,48 EUR');

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

    test('should set location.href to a mailto: URL with subject and summary body', () => {
      shareViaEmail(quote);

      expect(window.location.href).toContain('mailto:?subject=');

      const [, query] = window.location.href.split('?');
      const params = new URLSearchParams(query);
      const body = params.get('body') || '';

      expect(params.get('subject')).toContain('Presupuesto');
      expect(body).toContain('Melamina Blanca 244x122');
      expect(body).toContain('Total: 132,48 EUR');
    });
  });
});
