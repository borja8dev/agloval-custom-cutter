import type {
  HistoryLine,
  OrderHistoryEntry,
  OrderLine,
  OrderQuote
} from '../types';
import { isBoardLine } from './order';

export const MAX_HISTORY_ENTRIES = 50;

// Persisted shape: the counter lives next to the list so numbers survive deletions.
export interface OrderHistoryState {
  counter: number;
  orders: OrderHistoryEntry[];
}

export const EMPTY_HISTORY: OrderHistoryState = { counter: 0, orders: [] };

export function toHistoryLines(lines: OrderLine[]): HistoryLine[] {
  return lines.map((line): HistoryLine => {
    const base = {
      productId: line.product.id,
      name: line.product.name,
      sku: line.product.sku,
      unit: line.product.unit
    };
    return isBoardLine(line)
      ? { ...base, pieces: line.pieces.map((p) => ({ ...p })) }
      : { ...base, quantity: line.quantity };
  });
}

export function appendOrder(
  state: OrderHistoryState,
  quote: OrderQuote,
  lines: OrderLine[],
  now: Date = new Date()
): OrderHistoryState {
  const number = state.counter + 1;
  const entry: OrderHistoryEntry = {
    number,
    createdAt: now.toISOString(),
    total: quote.total,
    currency: quote.currency,
    lines: toHistoryLines(lines),
    groups: quote.groups
  };
  return {
    counter: number,
    orders: [entry, ...state.orders].slice(0, MAX_HISTORY_ENTRIES)
  };
}

export function removeOrderEntry(state: OrderHistoryState, number: number): OrderHistoryState {
  return { ...state, orders: state.orders.filter((o) => o.number !== number) };
}

// Guards against corrupt or foreign data in localStorage.
export function normalizeHistory(raw: unknown): OrderHistoryState {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return EMPTY_HISTORY;
  const { counter, orders } = raw as { counter?: unknown; orders?: unknown };
  if (typeof counter !== 'number' || !Array.isArray(orders)) return EMPTY_HISTORY;

  const valid = orders.filter(
    (o): o is OrderHistoryEntry =>
      typeof o === 'object' &&
      o !== null &&
      typeof (o as OrderHistoryEntry).number === 'number' &&
      Array.isArray((o as OrderHistoryEntry).lines) &&
      Array.isArray((o as OrderHistoryEntry).groups)
  );
  const highest = valid.reduce((max, o) => Math.max(max, o.number), 0);
  return { counter: Math.max(counter, highest), orders: valid };
}
