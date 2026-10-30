import type { HistoryState } from '../../utils/history';

// Port: where a quote or order history is persisted. Hooks depend on this, so
// tests (and a future backend) can swap the browser storage implementation.
export interface HistoryRepository {
  load(): HistoryState;
  save(state: HistoryState): void;
  /** Called after every save and whenever another tab changes the stored history. */
  subscribe(listener: () => void): () => void;
}
