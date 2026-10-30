import { useHistory, type UseHistoryReturn } from './useHistory';

// Confirmed orders, stored under `agloval_order_history_v3` (migrated from v2).
export function useOrderHistory(): UseHistoryReturn {
  return useHistory('order');
}
