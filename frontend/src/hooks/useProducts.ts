import { useEffect, useState } from 'react';
import { CatalogProduct, Product } from '../types';
import { listProducts, searchProducts, getErrorMessage } from '../services/api';

const PAGE_SIZE = 50;

interface UseProductsReturn {
  // Legacy typing for the current page; the API now returns CatalogProduct data.
  products: Product[];
  catalogProducts: CatalogProduct[];
  total: number;
  isLoading: boolean;
  error: string | null;
  search: (query: string) => Promise<Product[]>;
}

export function useProducts(family?: string): UseProductsReturn {
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cleanup flips this flag, so a response of a superseded request is ignored.
    let active = true;

    setIsLoading(true);
    setError(null);
    listProducts({ family, limit: PAGE_SIZE })
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
  }, [family]);

  const products = catalogProducts as unknown as Product[];

  const search = async (query: string): Promise<Product[]> => {
    if (!query || query.length < 2) {
      return products;
    }

    return searchProducts(query);
  };

  return { products, catalogProducts, total, isLoading, error, search };
}
