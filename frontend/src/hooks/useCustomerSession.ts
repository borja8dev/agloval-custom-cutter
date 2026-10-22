import { useCallback, useMemo } from 'react';
import type { Customer } from '../types';
import { useLocalStorage } from './useLocalStorage';

export const CUSTOMER_SESSION_KEY = 'agloval_customer_v1';

interface UseCustomerSessionReturn {
  customer: Customer | null;
  save: (customer: Customer) => void;
  logout: () => void;
}

function isCustomer(value: unknown): value is Customer {
  if (typeof value !== 'object' || value === null) return false;
  const { name, email, phone } = value as Record<string, unknown>;
  return typeof name === 'string' && typeof email === 'string' && typeof phone === 'string';
}

/** Simulated login: the customer's details are remembered in this browser only. */
export function useCustomerSession(): UseCustomerSessionReturn {
  const { data, setData } = useLocalStorage<unknown>(CUSTOMER_SESSION_KEY, null);

  const customer = useMemo(() => (isCustomer(data) ? data : null), [data]);

  const save = useCallback(
    ({ name, email, phone }: Customer) => setData({ name, email, phone }),
    [setData]
  );
  const logout = useCallback(() => setData(null), [setData]);

  return { customer, save, logout };
}
