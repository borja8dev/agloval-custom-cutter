import { useEffect, useState } from 'react';
import type { Family } from '../types';
import { getFamilies, getErrorMessage } from '../services/api';

interface UseFamiliesReturn {
  families: Family[];
  isLoading: boolean;
  error: string | null;
}

export function useFamilies(): UseFamiliesReturn {
  const [families, setFamilies] = useState<Family[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getFamilies()
      .then((data) => {
        if (!active) return;
        setFamilies(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err, 'Failed to fetch families'));
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { families, isLoading, error };
}
