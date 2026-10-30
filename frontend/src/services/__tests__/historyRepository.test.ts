import { describe, expect, test, beforeEach, vi } from 'vitest';
import {
  HISTORY_KEYS,
  LEGACY_ORDER_HISTORY_KEY,
  LocalStorageHistoryRepository
} from '../history';
import { EMPTY_HISTORY, appendEntry } from '../../utils/history';
import { makeQuote, sampleLines } from '../../test/fixtures';

const V2 = LEGACY_ORDER_HISTORY_KEY;
const V3 = HISTORY_KEYS.order;

function legacyV2() {
  const state = appendEntry(EMPTY_HISTORY, 'order', makeQuote(), sampleLines);
  // v2 entries had no `kind` and lived under `orders`.
  const withoutKind: Record<string, unknown> = { ...state.entries[0] };
  delete withoutKind.kind;
  return { counter: 9, orders: [withoutKind] };
}

function dispatchStorage(key: string | null) {
  window.dispatchEvent(new StorageEvent('storage', { key }));
}

describe('LocalStorageHistoryRepository', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test('uses one key per kind', () => {
    expect(HISTORY_KEYS).toEqual({
      quote: 'agloval_quote_history_v1',
      order: 'agloval_order_history_v3'
    });
  });

  test('loads empty when nothing is stored', () => {
    expect(new LocalStorageHistoryRepository('quote').load()).toEqual(EMPTY_HISTORY);
  });

  test('saves and loads back a normalized state', () => {
    const repo = new LocalStorageHistoryRepository('quote');
    const state = appendEntry(EMPTY_HISTORY, 'quote', makeQuote(), sampleLines);
    repo.save(state);
    expect(JSON.parse(localStorage.getItem(HISTORY_KEYS.quote)!)).toEqual(state);
    expect(repo.load()).toEqual(state);
  });

  test('quote and order histories do not share storage', () => {
    const quotes = new LocalStorageHistoryRepository('quote');
    quotes.save(appendEntry(EMPTY_HISTORY, 'quote', makeQuote(), sampleLines));
    expect(new LocalStorageHistoryRepository('order').load()).toEqual(EMPTY_HISTORY);
  });

  test('corrupt JSON loads empty without crashing', () => {
    localStorage.setItem(HISTORY_KEYS.quote, '{not json');
    expect(new LocalStorageHistoryRepository('quote').load()).toEqual(EMPTY_HISTORY);
  });

  test('blocked storage keeps working in memory', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const repo = new LocalStorageHistoryRepository('order');
    expect(repo.load()).toEqual(EMPTY_HISTORY);
    const state = appendEntry(EMPTY_HISTORY, 'order', makeQuote(), sampleLines);
    expect(() => repo.save(state)).not.toThrow();
    expect(repo.load()).toEqual(state);
  });

  test('notifies subscribers on save and on storage events for its key only', () => {
    const repo = new LocalStorageHistoryRepository('quote');
    const listener = vi.fn();
    const unsubscribe = repo.subscribe(listener);

    repo.save(EMPTY_HISTORY);
    expect(listener).toHaveBeenCalledTimes(1);

    dispatchStorage(HISTORY_KEYS.quote);
    expect(listener).toHaveBeenCalledTimes(2);

    dispatchStorage(HISTORY_KEYS.order);
    expect(listener).toHaveBeenCalledTimes(2);

    // `localStorage.clear()` in another tab arrives with a null key.
    dispatchStorage(null);
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    dispatchStorage(HISTORY_KEYS.quote);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  describe('order history migration v2 → v3', () => {
    test('moves v2 into v3 with kind "order", keeping the counter, and removes v2', () => {
      localStorage.setItem(V2, JSON.stringify(legacyV2()));
      const state = new LocalStorageHistoryRepository('order').load();
      expect(state.counter).toBe(9);
      expect(state.entries).toHaveLength(1);
      expect(state.entries[0]).toMatchObject({ kind: 'order', number: 1, total: 4.2 });
      expect(JSON.parse(localStorage.getItem(V3)!)).toEqual(state);
      expect(localStorage.getItem(V2)).toBeNull();
    });

    test('is idempotent', () => {
      localStorage.setItem(V2, JSON.stringify(legacyV2()));
      const first = new LocalStorageHistoryRepository('order').load();
      const second = new LocalStorageHistoryRepository('order').load();
      expect(second).toEqual(first);
      expect(localStorage.getItem(V2)).toBeNull();
    });

    test('corrupt v2 becomes an empty v3 without crashing', () => {
      localStorage.setItem(V2, '{not json');
      const state = new LocalStorageHistoryRepository('order').load();
      expect(state).toEqual(EMPTY_HISTORY);
      expect(JSON.parse(localStorage.getItem(V3)!)).toEqual(EMPTY_HISTORY);
      expect(localStorage.getItem(V2)).toBeNull();
    });

    test('an existing v3 wins and v2 is left untouched', () => {
      const v3 = appendEntry(EMPTY_HISTORY, 'order', makeQuote({ total: 1 }), sampleLines);
      localStorage.setItem(V3, JSON.stringify(v3));
      localStorage.setItem(V2, JSON.stringify(legacyV2()));
      expect(new LocalStorageHistoryRepository('order').load()).toEqual(v3);
      expect(localStorage.getItem(V2)).not.toBeNull();
    });

    test('the quote history never migrates v2', () => {
      localStorage.setItem(V2, JSON.stringify(legacyV2()));
      expect(new LocalStorageHistoryRepository('quote').load()).toEqual(EMPTY_HISTORY);
      expect(localStorage.getItem(V2)).not.toBeNull();
    });

    test('never touches the legacy calculation history', () => {
      localStorage.setItem('agloval_calculation_history', '[{"id":"old"}]');
      localStorage.setItem(V2, JSON.stringify(legacyV2()));
      new LocalStorageHistoryRepository('order').load();
      expect(localStorage.getItem('agloval_calculation_history')).toBe('[{"id":"old"}]');
    });
  });
});
