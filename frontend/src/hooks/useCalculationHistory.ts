import type { CalculationResponse } from '../types';
import { useLocalStorage } from './useLocalStorage';

const HISTORY_KEY = 'agloval_calculation_history';
const MAX_HISTORY_ITEMS = 50;

interface UseCalculationHistoryReturn {
  history: CalculationResponse[];
  isLoading: boolean;
  addItem: (calculation: CalculationResponse) => void;
  removeItem: (id: string) => void;
  clearHistory: () => void;
}

export function useCalculationHistory(): UseCalculationHistoryReturn {
  const { data: history, setData, isLoading } = useLocalStorage<CalculationResponse[]>(
    HISTORY_KEY,
    []
  );

  const addItem = (calculation: CalculationResponse) => {
    setData((prev) => [calculation, ...prev].slice(0, MAX_HISTORY_ITEMS));
  };

  const removeItem = (id: string) => {
    setData((prev) => prev.filter((item) => item.id !== id));
  };

  const clearHistory = () => {
    setData([]);
  };

  return { history, isLoading, addItem, removeItem, clearHistory };
}
