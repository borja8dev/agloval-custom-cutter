import { useEffect, useRef, useState } from 'react';

interface UseLocalStorageReturn<T> {
  data: T;
  setData: (value: T | ((prev: T) => T)) => void;
  isLoading: boolean;
}

export function useLocalStorage<T>(key: string, initialValue: T): UseLocalStorageReturn<T> {
  const [data, setData] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const initialValueRef = useRef(initialValue);

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

  // Another tab changed this key (a null key means it cleared the whole storage).
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== key) return;
      try {
        const raw = localStorage.getItem(key);
        setData(raw === null ? initialValueRef.current : (JSON.parse(raw) as T));
      } catch {
        // Ignore unreadable values written elsewhere
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
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
