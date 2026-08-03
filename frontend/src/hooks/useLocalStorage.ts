import { useEffect, useState } from 'react';

interface UseLocalStorageReturn<T> {
  data: T;
  setData: (value: T | ((prev: T) => T)) => void;
  isLoading: boolean;
}

export function useLocalStorage<T>(key: string, initialValue: T): UseLocalStorageReturn<T> {
  const [data, setData] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        setData(JSON.parse(raw) as T);
      }
    } catch {
      // Corrupted or blocked storage — fall back to initialValue
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  useEffect(() => {
    if (isLoading) return;

    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Persistence is a non-critical nicety (e.g. Safari private mode blocks it)
    }
  }, [key, data, isLoading]);

  return { data, setData, isLoading };
}
