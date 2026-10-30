import { useHistory, type UseHistoryReturn } from './useHistory';

// Saved quotes, stored under `agloval_quote_history_v1`.
export function useQuoteHistory(): UseHistoryReturn {
  return useHistory('quote');
}
