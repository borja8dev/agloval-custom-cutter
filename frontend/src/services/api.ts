import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ApiResponse,
  CatalogProduct,
  Family,
  OrderQuote,
  ProductListParams,
  ProductListResult,
  QuoteRequest
} from '../types';

export function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const backendMessage = (err.response?.data as ApiResponse<never> | undefined)?.error
      ?.message;
    if (backendMessage) {
      return backendMessage;
    }
  }

  return err instanceof Error ? err.message : fallback;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

const EMPTY_PRODUCT_PAGE: ProductListResult = { products: [], count: 0, total: 0 };

function definedOnly<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

export async function getProduct<T = CatalogProduct>(productId: string): Promise<T> {
  const response = await apiClient.get<ApiResponse<T>>(
    `/api/products/${productId}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Product not found');
  }

  return response.data.data;
}

export async function getFamilies(): Promise<Family[]> {
  const response = await apiClient.get<ApiResponse<{ families: Family[]; count: number }>>(
    '/api/families'
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to fetch families');
  }

  return response.data.data.families;
}

export async function listProducts(
  params: ProductListParams = {}
): Promise<ProductListResult> {
  const response = await apiClient.get<ApiResponse<ProductListResult>>('/api/products', {
    params: definedOnly(params)
  });

  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to fetch products');
  }

  return response.data.data;
}

export async function searchCatalogProducts(
  query: string,
  params: ProductListParams = {}
): Promise<ProductListResult> {
  try {
    const response = await apiClient.get<ApiResponse<ProductListResult>>(
      '/api/products/search',
      { params: { q: query, ...definedOnly(params) } }
    );

    if (!response.data.success || !response.data.data) {
      return EMPTY_PRODUCT_PAGE;
    }

    return response.data.data;
  } catch (error) {
    console.error(`Error searching products for "${query}":`, error);
    return EMPTY_PRODUCT_PAGE;
  }
}

export async function quoteOrder(
  request: QuoteRequest,
  signal?: AbortSignal
): Promise<OrderQuote> {
  const response = await apiClient.post<ApiResponse<OrderQuote>>(
    '/api/orders/quote',
    request,
    { signal }
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to quote order');
  }

  return response.data.data;
}

export default apiClient;
