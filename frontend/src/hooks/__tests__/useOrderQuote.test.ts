import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../services/api', () => ({
  quoteOrder: vi.fn(),
  getErrorMessage: (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)
}));

import { quoteOrder } from '../../services/api';
import { useOrderQuote } from '../useOrderQuote';
import { makeQuote } from '../../test/fixtures';
import type { QuoteRequest } from '../../types';

const mocked = vi.mocked(quoteOrder);
const requestA: QuoteRequest = { lines: [{ productId: 'p_ud', quantity: 1 }] };
const requestB: QuoteRequest = { lines: [{ productId: 'p_ud', quantity: 2 }] };

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useOrderQuote', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocked.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('empty order: no request and null quote', async () => {
    const { result } = renderHook(() => useOrderQuote({ lines: [] }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(mocked).not.toHaveBeenCalled();
    expect(result.current).toEqual({ quote: null, isLoading: false, error: null });
  });

  test('debounces: one call, 300 ms after the last change', async () => {
    mocked.mockResolvedValue(makeQuote());
    const { result, rerender } = renderHook(({ req }) => useOrderQuote(req), {
      initialProps: { req: requestA }
    });
    expect(result.current.isLoading).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    rerender({ req: requestB });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(mocked).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(mocked.mock.calls[0][0]).toEqual(requestB);
    expect(result.current.quote).toEqual(makeQuote());
    expect(result.current.isLoading).toBe(false);
  });

  test('a new request object with the same content does not re-fetch', async () => {
    mocked.mockResolvedValue(makeQuote());
    const { rerender } = renderHook(({ req }) => useOrderQuote(req), {
      initialProps: { req: requestA }
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    rerender({ req: JSON.parse(JSON.stringify(requestA)) });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(mocked).toHaveBeenCalledTimes(1);
  });

  test('the debounce delay is injectable', async () => {
    mocked.mockResolvedValue(makeQuote());
    renderHook(() => useOrderQuote(requestA, 50));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(mocked).toHaveBeenCalledTimes(1);
  });

  test('a stale response never overwrites a newer one', async () => {
    let resolveFirst!: (q: ReturnType<typeof makeQuote>) => void;
    mocked.mockReturnValueOnce(new Promise((r) => (resolveFirst = r)));
    mocked.mockResolvedValueOnce(makeQuote({ total: 99 }));
    const { result, rerender } = renderHook(({ req }) => useOrderQuote(req), {
      initialProps: { req: requestA }
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    rerender({ req: requestB });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.quote?.total).toBe(99);
    await act(async () => {
      resolveFirst(makeQuote({ total: 1 }));
    });
    await flush();
    expect(result.current.quote?.total).toBe(99);
  });

  test('surfaces the error message and clears the quote', async () => {
    mocked.mockRejectedValue(new Error('Producto no encontrado'));
    const { result } = renderHook(() => useOrderQuote(requestA));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.error).toBe('Producto no encontrado');
    expect(result.current.quote).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  test('emptying the order resets the quote and ignores an in-flight response', async () => {
    let resolve!: (q: ReturnType<typeof makeQuote>) => void;
    mocked.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const { result, rerender } = renderHook(({ req }) => useOrderQuote(req), {
      initialProps: { req: requestA }
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    rerender({ req: { lines: [] } });
    await act(async () => {
      resolve(makeQuote());
    });
    await flush();
    expect(result.current).toEqual({ quote: null, isLoading: false, error: null });
  });
});
