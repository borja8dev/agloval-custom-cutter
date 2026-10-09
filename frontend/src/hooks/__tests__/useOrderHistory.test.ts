import { describe, expect, test, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOrderHistory } from '../useOrderHistory';
import { makeQuote, sampleLines } from '../../test/fixtures';

const KEY = 'agloval_order_history_v2';

async function setup() {
  const hook = renderHook(() => useOrderHistory());
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe('useOrderHistory', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test('starts empty', async () => {
    const { result } = await setup();
    expect(result.current.history).toEqual([]);
  });

  test('addOrder numbers orders, newest first, and persists under the v2 key', async () => {
    const { result } = await setup();
    act(() => result.current.addOrder(makeQuote(), sampleLines));
    act(() => result.current.addOrder(makeQuote({ total: 7 }), sampleLines));
    expect(result.current.history.map((o) => o.number)).toEqual([2, 1]);
    expect(result.current.history[0].total).toBe(7);
    expect(result.current.history[0].lines[0]).toMatchObject({ productId: 'p_m2', unit: 'M2' });
    await waitFor(() => expect(JSON.parse(localStorage.getItem(KEY)!).counter).toBe(2));
  });

  test('numbers are never reused after removing the newest order', async () => {
    const { result } = await setup();
    act(() => result.current.addOrder(makeQuote(), sampleLines));
    act(() => result.current.addOrder(makeQuote(), sampleLines));
    act(() => result.current.removeOrder(2));
    act(() => result.current.addOrder(makeQuote(), sampleLines));
    expect(result.current.history.map((o) => o.number)).toEqual([3, 1]);
  });

  test('numbers are never reused after clearHistory, even across mounts', async () => {
    const first = await setup();
    act(() => first.result.current.addOrder(makeQuote(), sampleLines));
    act(() => first.result.current.addOrder(makeQuote(), sampleLines));
    act(() => first.result.current.clearHistory());
    expect(first.result.current.history).toEqual([]);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(KEY)!).orders).toEqual([]));
    first.unmount();

    const second = await setup();
    act(() => second.result.current.addOrder(makeQuote(), sampleLines));
    expect(second.result.current.history.map((o) => o.number)).toEqual([3]);
  });

  test('caps the history at 50 entries', async () => {
    const { result } = await setup();
    act(() => {
      for (let i = 0; i < 53; i++) result.current.addOrder(makeQuote(), sampleLines);
    });
    expect(result.current.history).toHaveLength(50);
    expect(result.current.history[0].number).toBe(53);
  });

  test('corrupt JSON starts empty without crashing', async () => {
    localStorage.setItem(KEY, '{not json');
    const { result } = await setup();
    expect(result.current.history).toEqual([]);
    act(() => result.current.addOrder(makeQuote(), sampleLines));
    expect(result.current.history[0].number).toBe(1);
  });

  test('valid JSON of the wrong shape starts empty without crashing', async () => {
    localStorage.setItem(KEY, JSON.stringify(['legacy', 'array']));
    const { result } = await setup();
    expect(result.current.history).toEqual([]);
  });

  test('unavailable localStorage does not crash and keeps working in memory', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = await setup();
    act(() => result.current.addOrder(makeQuote(), sampleLines));
    expect(result.current.history).toHaveLength(1);
  });

  test('does not read or delete the legacy calculation history key', async () => {
    localStorage.setItem('agloval_calculation_history', '[{"id":"old"}]');
    const { result } = await setup();
    act(() => result.current.clearHistory());
    expect(localStorage.getItem('agloval_calculation_history')).toBe('[{"id":"old"}]');
    expect(result.current.history).toEqual([]);
  });
});
