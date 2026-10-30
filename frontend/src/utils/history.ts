import type {
  Customer,
  HistoryEntry,
  HistoryKind,
  HistoryLine,
  OrderLine,
  OrderQuote
} from '../types';
import { isBoardLine } from './order';

export const MAX_HISTORY_ENTRIES = 200;

// Persisted shape: the counter lives next to the list so numbers survive deletions.
export interface HistoryState {
  counter: number;
  entries: HistoryEntry[];
}

export interface HistoryEntryDetails {
  customer?: Customer;
  reference?: string;
  fromQuoteNumber?: number;
}

export const EMPTY_HISTORY: HistoryState = { counter: 0, entries: [] };

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

export function appendEntry(
  state: HistoryState,
  kind: HistoryKind,
  quote: OrderQuote,
  lines: OrderLine[],
  details: HistoryEntryDetails = {},
  now: Date = new Date()
): HistoryState {
  const number = state.counter + 1;
  const entry: HistoryEntry = {
    kind,
    number,
    createdAt: now.toISOString(),
    total: quote.total,
    currency: quote.currency,
    lines: toHistoryLines(lines),
    groups: quote.groups,
    ...pickDetails(details)
  };
  return {
    counter: number,
    entries: [entry, ...state.entries].slice(0, MAX_HISTORY_ENTRIES)
  };
}

export function removeEntry(state: HistoryState, number: number): HistoryState {
  return { ...state, entries: state.entries.filter((e) => e.number !== number) };
}

export function markConverted(
  state: HistoryState,
  quoteNumber: number,
  orderNumber: number
): HistoryState {
  if (!state.entries.some((e) => e.number === quoteNumber)) return state;
  return {
    ...state,
    entries: state.entries.map((e) =>
      e.number === quoteNumber ? { ...e, convertedToOrder: orderNumber } : e
    )
  };
}

// Guards against corrupt or foreign data in localStorage. Never throws.
export function normalizeHistory(raw: unknown, kind: HistoryKind): HistoryState {
  if (!isRecord(raw)) return EMPTY_HISTORY;
  const { counter, entries } = raw;
  if (typeof counter !== 'number' || !Array.isArray(entries)) return EMPTY_HISTORY;

  const valid = entries.flatMap((e) => {
    const entry = normalizeEntry(e, kind);
    return entry ? [entry] : [];
  });
  const highest = valid.reduce((max, e) => Math.max(max, e.number), 0);
  return { counter: Math.max(counter, highest), entries: valid };
}

// Required fields drop the whole entry; invalid optional fields are dropped alone.
function normalizeEntry(raw: unknown, kind: HistoryKind): HistoryEntry | null {
  if (!isRecord(raw)) return null;
  const { number, createdAt, total, currency, lines, groups } = raw;
  if (
    !isPositiveInteger(number) ||
    typeof createdAt !== 'string' ||
    typeof total !== 'number' ||
    typeof currency !== 'string' ||
    !Array.isArray(lines) ||
    !Array.isArray(groups)
  ) {
    return null;
  }
  const entry: HistoryEntry = {
    kind,
    number,
    createdAt,
    total,
    currency,
    lines,
    groups,
    ...pickDetails(raw)
  };
  if (isPositiveInteger(raw.convertedToOrder)) entry.convertedToOrder = raw.convertedToOrder;
  return entry;
}

function pickDetails(raw: Record<string, unknown> | HistoryEntryDetails): HistoryEntryDetails {
  const details: HistoryEntryDetails = {};
  if (isCustomer(raw.customer)) {
    const { name, email, phone } = raw.customer;
    details.customer = { name, email, phone };
  }
  if (typeof raw.reference === 'string' && raw.reference.trim() !== '') {
    details.reference = raw.reference;
  }
  if (isPositiveInteger(raw.fromQuoteNumber)) details.fromQuoteNumber = raw.fromQuoteNumber;
  return details;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isCustomer(value: unknown): value is Customer {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    typeof value.phone === 'string'
  );
}
