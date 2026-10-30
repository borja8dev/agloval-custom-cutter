import type { HistoryKind } from '../../types';
import { EMPTY_HISTORY, normalizeHistory, type HistoryState } from '../../utils/history';
import type { HistoryRepository } from './HistoryRepository';

export const HISTORY_KEYS: Record<HistoryKind, string> = {
  quote: 'agloval_quote_history_v1',
  order: 'agloval_order_history_v3'
};

// Only migrated into v3; the older `agloval_calculation_history` is never touched.
export const LEGACY_ORDER_HISTORY_KEY = 'agloval_order_history_v2';

function parse(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export class LocalStorageHistoryRepository implements HistoryRepository {
  private readonly key: string;
  private readonly listeners = new Set<() => void>();
  // Last saved state, served while the browser refuses storage (private mode, quota).
  private memory: HistoryState = EMPTY_HISTORY;
  private storageFailed = false;

  constructor(private readonly kind: HistoryKind) {
    this.key = HISTORY_KEYS[kind];
  }

  load(): HistoryState {
    if (this.storageFailed) return this.memory;
    try {
      if (this.kind === 'order') this.migrateLegacyOrders();
      return normalizeHistory(parse(localStorage.getItem(this.key)), this.kind);
    } catch {
      return this.memory;
    }
  }

  save(state: HistoryState): void {
    this.memory = state;
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
      this.storageFailed = false;
    } catch {
      this.storageFailed = true;
    }
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    if (this.listeners.size === 0) window.addEventListener('storage', this.handleStorage);
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) window.removeEventListener('storage', this.handleStorage);
    };
  }

  // A null key means another tab cleared the whole storage.
  private handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === this.key) this.notify();
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // v2 → v3: idempotent because v2 is removed once v3 is written; an existing v3 wins.
  private migrateLegacyOrders() {
    if (localStorage.getItem(this.key) !== null) return;
    const legacy = localStorage.getItem(LEGACY_ORDER_HISTORY_KEY);
    if (legacy === null) return;

    const raw = parse(legacy);
    const { counter, orders } = (typeof raw === 'object' && raw !== null ? raw : {}) as {
      counter?: unknown;
      orders?: unknown;
    };
    const migrated = normalizeHistory({ counter, entries: orders }, 'order');
    localStorage.setItem(this.key, JSON.stringify(migrated));
    localStorage.removeItem(LEGACY_ORDER_HISTORY_KEY);
  }
}
