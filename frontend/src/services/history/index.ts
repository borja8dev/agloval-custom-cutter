import type { HistoryKind } from '../../types';
import type { HistoryRepository } from './HistoryRepository';
import { LocalStorageHistoryRepository } from './LocalStorageHistoryRepository';

export type { HistoryRepository } from './HistoryRepository';
export {
  HISTORY_KEYS,
  LEGACY_ORDER_HISTORY_KEY,
  LocalStorageHistoryRepository
} from './LocalStorageHistoryRepository';

// One shared instance per kind, so every hook in the tab sees the same saves.
const repositories: Record<HistoryKind, HistoryRepository> = {
  quote: new LocalStorageHistoryRepository('quote'),
  order: new LocalStorageHistoryRepository('order')
};

export function getHistoryRepository(kind: HistoryKind): HistoryRepository {
  return repositories[kind];
}
