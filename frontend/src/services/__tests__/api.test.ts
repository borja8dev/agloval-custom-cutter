import { describe, expect, test, vi, beforeEach } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('axios', () => {
  const isAxiosError = (e: unknown) => Boolean((e as { isAxiosError?: boolean })?.isAxiosError);
  const instance = { get, post, delete: vi.fn(), interceptors: { response: { use: vi.fn() } } };
  return { default: { create: () => instance, isAxiosError }, isAxiosError };
});

import {
  getFamilies,
  listProducts,
  searchCatalogProducts,
  quoteOrder,
  submitOrder,
  getProduct,
  getErrorMessage
} from '../api';
import { makeQuote, m2Product } from '../../test/fixtures';

const ok = <T>(data: T) => ({ data: { success: true, data, timestamp: 'x' } });

describe('catalog api', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  test('getFamilies returns the families array', async () => {
    const families = [{ code: 'MEL', name: 'Melamina', productCount: 1, units: { UD: 0, M2: 1, ML: 0 } }];
    get.mockResolvedValue(ok({ families, count: 1 }));
    await expect(getFamilies()).resolves.toEqual(families);
    expect(get).toHaveBeenCalledWith('/api/families');
  });

  test('getFamilies throws when the API reports failure', async () => {
    get.mockResolvedValue({ data: { success: false, timestamp: 'x' } });
    await expect(getFamilies()).rejects.toThrow();
  });

  test('listProducts sends only the defined filters and returns the page', async () => {
    const page = { products: [m2Product], count: 1, total: 7 };
    get.mockResolvedValue(ok(page));
    await expect(listProducts({ family: 'MEL', unit: 'M2', limit: 20, skip: 40 })).resolves.toEqual(page);
    expect(get).toHaveBeenCalledWith('/api/products', {
      params: { family: 'MEL', unit: 'M2', limit: 20, skip: 40 }
    });
  });

  test('listProducts omits undefined params', async () => {
    get.mockResolvedValue(ok({ products: [], count: 0, total: 0 }));
    await listProducts({});
    expect(get).toHaveBeenCalledWith('/api/products', { params: {} });
  });

  test('searchCatalogProducts passes q and filters', async () => {
    const page = { products: [m2Product], count: 1, total: 1 };
    get.mockResolvedValue(ok(page));
    await expect(searchCatalogProducts('blanca', { family: 'MEL' })).resolves.toEqual(page);
    expect(get).toHaveBeenCalledWith('/api/products/search', {
      params: { q: 'blanca', family: 'MEL' }
    });
  });

  test('searchCatalogProducts returns an empty page on failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    get.mockRejectedValue(new Error('boom'));
    await expect(searchCatalogProducts('blanca')).resolves.toEqual({ products: [], count: 0, total: 0 });
  });

  test('getProduct fetches by id', async () => {
    get.mockResolvedValue(ok(m2Product));
    await expect(getProduct(m2Product.id)).resolves.toEqual(m2Product);
    expect(get).toHaveBeenCalledWith(`/api/products/${m2Product.id}`);
  });

  test('quoteOrder posts the request and returns the quote', async () => {
    const quote = makeQuote();
    post.mockResolvedValue(ok(quote));
    const request = { lines: [{ productId: 'p_ud', quantity: 12 }] };
    await expect(quoteOrder(request)).resolves.toEqual(quote);
    expect(post).toHaveBeenCalledWith('/api/orders/quote', request, { signal: undefined });
  });

  test('quoteOrder forwards an abort signal', async () => {
    post.mockResolvedValue(ok(makeQuote()));
    const controller = new AbortController();
    await quoteOrder({ lines: [] }, controller.signal);
    expect(post).toHaveBeenCalledWith('/api/orders/quote', { lines: [] }, { signal: controller.signal });
  });

  test('quoteOrder errors surface the backend message through getErrorMessage', async () => {
    const error = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: { data: { error: { code: 'INVALID_ORDER_LINE', message: 'Tornillo se vende por UD' } } }
    });
    post.mockRejectedValue(error);
    const caught = await quoteOrder({ lines: [] }).catch((e) => e);
    expect(getErrorMessage(caught, 'fallback')).toBe('Tornillo se vende por UD');
  });

  describe('submitOrder', () => {
    const request = {
      orderNumber: 3,
      customer: { name: 'Lucía Ferrer', email: 'lucia@example.com', phone: '600 123 456' },
      privacyAccepted: true as const,
      lines: [{ productId: 'p_ud', quantity: 12 }]
    };

    test('posts the order to the submit endpoint and returns the result', async () => {
      const result = {
        orderNumber: 3,
        quote: makeQuote(),
        emails: { customer: 'sent', agloval: 'skipped' }
      };
      post.mockResolvedValue(ok(result));

      await expect(submitOrder(request)).resolves.toEqual(result);
      expect(post).toHaveBeenCalledWith('/api/orders/submit', request);
    });

    test('throws when the API reports failure', async () => {
      post.mockResolvedValue({ data: { success: false, timestamp: 'x' } });
      await expect(submitOrder(request)).rejects.toThrow();
    });

    test('surfaces the backend message through getErrorMessage', async () => {
      const error = Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        response: {
          status: 502,
          data: {
            error: {
              code: 'EMAIL_DELIVERY_FAILED',
              message: 'No hemos podido enviar el correo. Inténtalo de nuevo en unos minutos.'
            }
          }
        }
      });
      post.mockRejectedValue(error);
      const caught = await submitOrder(request).catch((e) => e);
      expect(getErrorMessage(caught, 'fallback')).toBe(
        'No hemos podido enviar el correo. Inténtalo de nuevo en unos minutos.'
      );
    });
  });
});
