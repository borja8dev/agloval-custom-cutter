import { useCallback, useMemo } from 'react';
import type { OrderHistoryEntry, OrderLine, OrderQuote } from '../types';
import {
  EMPTY_HISTORY,
  appendOrder,
  normalizeHistory,
  removeOrderEntry,
  type OrderHistoryState
} from '../utils/orderHistory';
import { useLocalStorage } from './useLocalStorage';

// v2: the old `agloval_calculation_history` key is deliberately left untouched.
const HISTORY_KEY = 'agloval_order_history_v2';

interface UseOrderHistoryReturn {
  history: OrderHistoryEntry[];
  isLoading: boolean;
  addOrder: (quote: OrderQuote, lines: OrderLine[]) => void;
  removeOrder: (number: number) => void;
  clearHistory: () => void;
}

export function useOrderHistory(): UseOrderHistoryReturn {
  const { data, setData, isLoading } = useLocalStorage<OrderHistoryState>(
    HISTORY_KEY,
    EMPTY_HISTORY
  );

  const state = useMemo(() => normalizeHistory(data), [data]);

  const addOrder = useCallback(
    (quote: OrderQuote, lines: OrderLine[]) =>
      setData((prev) => appendOrder(normalizeHistory(prev), quote, lines)),
    [setData]
  );

  const removeOrder = useCallback(
    (number: number) => setData((prev) => removeOrderEntry(normalizeHistory(prev), number)),
    [setData]
  );

  // Keeps the counter so order numbers are never reused.
  const clearHistory = useCallback(
    () => setData((prev) => ({ counter: normalizeHistory(prev).counter, orders: [] })),
    [setData]
  );

  return { history: state.orders, isLoading, addOrder, removeOrder, clearHistory };
}
