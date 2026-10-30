import { describe, expect, test, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from '../useHistory';
import { HISTORY_KEYS, LocalStorageHistoryRepository } from '../../services/history';
import type { HistoryRepository } from '../../services/history';
import { EMPTY_HISTORY, appendEntry, type HistoryState } from '../../utils/history';
import { makeQuote, sampleLines } from '../../test/fixtures';

const customer = { name: 'Lucía', email: 'lucia@example.com', phone: '600000000' };

// In-memory fake: proves the hook only talks to the port.
function fakeRepository(initial: HistoryState = EMPTY_HISTORY) {
  let state = initial;
  const listeners = new Set<() => void>();
  const repo: HistoryRepository & { emitExternal: (next: HistoryState) => void } = {
    load: () => state,
    save: (next) => {
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emitExternal: (next) => {
      state = next;
      listeners.forEach((l) => l());
    }
  };
  return repo;
}

function setup(kind: 'quote' | 'order' = 'quote', repo: HistoryRepository = fakeRepository()) {
  return { repo, ...renderHook(() => useHistory(kind, repo)) };
}

describe('useHistory', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test('starts with what the repository holds', () => {
    const initial = appendEntry(EMPTY_HISTORY, 'quote', makeQuote(), sampleLines);
    const { result } = setup('quote', fakeRepository(initial));
    expect(result.current.entries).toEqual(initial.entries);
    expect(result.current.nextNumber).toBe(2);
  });

  test('add numbers entries of its kind, newest first, returns the number and saves', () => {
    const { result, repo } = setup('quote');
    let first = 0;
    act(() => {
      first = result.current.add(makeQuote(), sampleLines, { reference: 'Cocina' });
    });
    act(() => {
      result.current.add(makeQuote({ total: 7 }), sampleLines);
    });
    expect(first).toBe(1);
    expect(result.current.entries.map((e) => [e.kind, e.number])).toEqual([
      ['quote', 2],
      ['quote', 1]
    ]);
    expect(result.current.entries[1].reference).toBe('Cocina');
    expect(repo.load().counter).toBe(2);
  });

  test('several adds in one batch all land', () => {
    const { result } = setup('order');
    act(() => {
      for (let i = 0; i < 3; i++) result.current.add(makeQuote(), sampleLines);
    });
    expect(result.current.entries.map((e) => e.number)).toEqual([3, 2, 1]);
  });

  test('remove and clear never free a number', () => {
    const { result } = setup('order');
    act(() => {
      result.current.add(makeQuote(), sampleLines);
      result.current.add(makeQuote(), sampleLines);
    });
    act(() => result.current.remove(2));
    expect(result.current.entries.map((e) => e.number)).toEqual([1]);
    expect(result.current.nextNumber).toBe(3);
    act(() => result.current.clear());
    expect(result.current.entries).toEqual([]);
    expect(result.current.nextNumber).toBe(3);
  });

  test('markConverted links a quote to its order', () => {
    const { result } = setup('quote');
    act(() => {
      result.current.add(makeQuote(), sampleLines);
    });
    act(() => result.current.markConverted(1, 12));
    expect(result.current.entries[0].convertedToOrder).toBe(12);
  });

  test('re-renders when the repository changes elsewhere', () => {
    const repo = fakeRepository();
    const { result } = setup('order', repo);
    act(() => repo.emitExternal(appendEntry(EMPTY_HISTORY, 'order', makeQuote(), sampleLines)));
    expect(result.current.entries).toHaveLength(1);
  });

  test('two hooks on the same repository stay in sync', () => {
    const repo = fakeRepository();
    const a = renderHook(() => useHistory('order', repo));
    const b = renderHook(() => useHistory('order', repo));
    act(() => {
      a.result.current.add(makeQuote(), sampleLines, { customer });
    });
    expect(b.result.current.entries[0].customer).toEqual(customer);
  });

  test('picks up another tab writing the localStorage history', () => {
    const repo = new LocalStorageHistoryRepository('quote');
    const { result } = setup('quote', repo);
    const other = appendEntry(EMPTY_HISTORY, 'quote', makeQuote(), sampleLines);
    act(() => {
      localStorage.setItem(HISTORY_KEYS.quote, JSON.stringify(other));
      window.dispatchEvent(new StorageEvent('storage', { key: HISTORY_KEYS.quote }));
    });
    expect(result.current.entries).toEqual(other.entries);
  });
});
