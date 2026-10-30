import { describe, expect, test, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrderHistory } from '../useOrderHistory';
import { useQuoteHistory } from '../useQuoteHistory';
import { HISTORY_KEYS, LEGACY_ORDER_HISTORY_KEY } from '../../services/history';
import { makeQuote, sampleLines } from '../../test/fixtures';

describe('useOrderHistory / useQuoteHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('useOrderHistory persists orders under the v3 key', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.add(makeQuote(), sampleLines);
    });
    expect(result.current.entries[0].kind).toBe('order');
    expect(JSON.parse(localStorage.getItem(HISTORY_KEYS.order)!).counter).toBe(1);
  });

  test('useQuoteHistory persists quotes under their own key', () => {
    const { result } = renderHook(() => useQuoteHistory());
    act(() => {
      result.current.add(makeQuote(), sampleLines);
    });
    expect(result.current.entries[0].kind).toBe('quote');
    expect(JSON.parse(localStorage.getItem(HISTORY_KEYS.quote)!).counter).toBe(1);
    expect(localStorage.getItem(HISTORY_KEYS.order)).toBeNull();
  });

  test('useOrderHistory shows the migrated v2 history and keeps numbering after it', () => {
    localStorage.setItem(
      LEGACY_ORDER_HISTORY_KEY,
      JSON.stringify({ counter: 4, orders: [] })
    );
    const { result } = renderHook(() => useOrderHistory());
    expect(result.current.nextNumber).toBe(5);
  });
});
