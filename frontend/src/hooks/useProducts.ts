import { useEffect, useState } from 'react';
import { CatalogProduct } from '../types';
import { listProducts, searchCatalogProducts, getErrorMessage } from '../services/api';

const PAGE_SIZE = 50;
const MIN_QUERY_LENGTH = 2;

interface UseProductsReturn {
  catalogProducts: CatalogProduct[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

// Loads one page of the catalog, filtered by family. A query of 2+ characters
// switches to the search endpoint (still scoped to the family); anything
// shorter shows the plain family list again.
export function useProducts(family?: string, query: string = ''): UseProductsReturn {
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = query.trim();

  useEffect(() => {
    // Cleanup flips this flag, so a response of a superseded request is ignored.
    let active = true;

    setIsLoading(true);
    setError(null);
    const request =
      trimmedQuery.length >= MIN_QUERY_LENGTH
        ? searchCatalogProducts(trimmedQuery, { family, limit: PAGE_SIZE })
        : listProducts({ family, limit: PAGE_SIZE });

    request
      .then((page) => {
        if (!active) return;
        setCatalogProducts(page.products);
        setTotal(page.total);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err, 'Failed to fetch products'));
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [family, trimmedQuery]);

  return { catalogProducts, total, isLoading, error };
}
