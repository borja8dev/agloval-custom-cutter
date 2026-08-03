import { useEffect, useState } from 'react';
import { Product } from '../types';
import { getProducts, searchProducts } from '../services/api';

interface UseProductsReturn {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => Promise<Product[]>;
}

export function useProducts(): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getProducts(50);
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const search = async (query: string): Promise<Product[]> => {
    if (!query || query.length < 2) {
      return products;
    }

    return searchProducts(query);
  };

  return {
    products,
    isLoading,
    error,
    search
  };
}
