import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('../../services/api', () => ({
  listProducts: vi.fn(),
  searchProducts: vi.fn(),
  getErrorMessage: (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)
}));

import { listProducts, searchProducts } from '../../services/api';
import { useProducts } from '../useProducts';
import { m2Product, udProduct } from '../../test/fixtures';

const mockedList = vi.mocked(listProducts);

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('useProducts', () => {
  beforeEach(() => {
    mockedList.mockReset();
    vi.mocked(searchProducts).mockReset();
  });

  test('old call signature loads the first page and exposes total', async () => {
    mockedList.mockResolvedValue({ products: [m2Product], count: 1, total: 9 });
    const { result } = renderHook(() => useProducts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.catalogProducts).toEqual([m2Product]);
    expect(result.current.total).toBe(9);
    expect(mockedList).toHaveBeenCalledWith({ family: undefined, limit: 50 });
  });

  test('refetches when the family changes', async () => {
    mockedList.mockResolvedValueOnce({ products: [m2Product], count: 1, total: 1 });
    mockedList.mockResolvedValueOnce({ products: [udProduct], count: 1, total: 1 });
    const { result, rerender } = renderHook(({ family }) => useProducts(family), {
      initialProps: { family: 'MEL' as string | undefined }
    });
    await waitFor(() => expect(result.current.catalogProducts).toEqual([m2Product]));
    rerender({ family: 'FER' });
    await waitFor(() => expect(result.current.catalogProducts).toEqual([udProduct]));
    expect(mockedList).toHaveBeenLastCalledWith({ family: 'FER', limit: 50 });
  });

  test('a stale response never overwrites a newer one', async () => {
    const first = deferred<{ products: typeof m2Product[]; count: number; total: number }>();
    const second = deferred<{ products: typeof m2Product[]; count: number; total: number }>();
    mockedList.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(({ family }) => useProducts(family), {
      initialProps: { family: 'MEL' }
    });
    rerender({ family: 'FER' });
    await act(async () => {
      second.resolve({ products: [udProduct], count: 1, total: 1 });
    });
    await waitFor(() => expect(result.current.catalogProducts).toEqual([udProduct]));
    await act(async () => {
      first.resolve({ products: [m2Product], count: 1, total: 1 });
    });
    expect(result.current.catalogProducts).toEqual([udProduct]);
    expect(result.current.isLoading).toBe(false);
  });

  test('a stale failure does not set an error', async () => {
    let reject!: (e: Error) => void;
    const first = new Promise<never>((_, r) => (reject = r));
    mockedList.mockReturnValueOnce(first);
    mockedList.mockResolvedValueOnce({ products: [udProduct], count: 1, total: 1 });
    const { result, rerender } = renderHook(({ family }) => useProducts(family), {
      initialProps: { family: 'MEL' }
    });
    rerender({ family: 'FER' });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      reject(new Error('late failure'));
    });
    expect(result.current.error).toBeNull();
    expect(result.current.catalogProducts).toEqual([udProduct]);
  });

  test('exposes the error message on failure', async () => {
    mockedList.mockRejectedValue(new Error('fallo'));
    const { result } = renderHook(() => useProducts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('fallo');
  });

  test('search keeps the legacy behaviour', async () => {
    mockedList.mockResolvedValue({ products: [m2Product], count: 1, total: 1 });
    vi.mocked(searchProducts).mockResolvedValue([]);
    const { result } = renderHook(() => useProducts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(result.current.search('a')).resolves.toEqual(result.current.products);
    await result.current.search('blanca');
    expect(searchProducts).toHaveBeenCalledWith('blanca');
  });
});
