import { useCallback, useEffect, useState } from 'react';
import type { HistoryEntry, HistoryKind, OrderLine, OrderQuote } from '../types';
import { getHistoryRepository, type HistoryRepository } from '../services/history';
import {
  appendEntry,
  markConverted as markConvertedEntry,
  removeEntry,
  type HistoryEntryDetails,
  type HistoryState,
} from '../utils/history';

export interface UseHistoryReturn {
  entries: HistoryEntry[];
  /** Number the next entry will get; deleted numbers are never reused. */
  nextNumber: number;
  /** Stores a new entry and returns its number. */
  add: (quote: OrderQuote, lines: OrderLine[], details?: HistoryEntryDetails) => number;
  remove: (number: number) => void;
  /** Empties the list but keeps the counter. */
  clear: () => void;
  markConverted: (quoteNumber: number, orderNumber: number) => void;
}

export function useHistory(
  kind: HistoryKind,
  repository: HistoryRepository = getHistoryRepository(kind)
): UseHistoryReturn {
  const [state, setState] = useState<HistoryState>(() => repository.load());

  useEffect(() => {
    const refresh = () => setState(repository.load());
    refresh();
    return repository.subscribe(refresh);
  }, [repository]);

  // Each change starts from the stored state, so batched calls and other tabs are not lost.
  const update = useCallback(
    (change: (prev: HistoryState) => HistoryState) => {
      const next = change(repository.load());
      repository.save(next);
      setState(next);
      return next;
    },
    [repository]
  );

  const add = useCallback(
    (quote: OrderQuote, lines: OrderLine[], details?: HistoryEntryDetails) =>
      update((prev) => appendEntry(prev, kind, quote, lines, details)).counter,
    [update, kind]
  );

  const remove = useCallback(
    (number: number) => {
      update((prev) => removeEntry(prev, number));
    },
    [update]
  );

  const clear = useCallback(() => {
    update((prev) => ({ counter: prev.counter, entries: [] }));
  }, [update]);

  const markConverted = useCallback(
    (quoteNumber: number, orderNumber: number) => {
      update((prev) => markConvertedEntry(prev, quoteNumber, orderNumber));
    },
    [update]
  );

  return {
    entries: state.entries,
    nextNumber: state.counter + 1,
    add,
    remove,
    clear,
    markConverted,
  };
}
