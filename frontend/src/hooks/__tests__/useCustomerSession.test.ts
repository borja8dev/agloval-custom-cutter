import { describe, expect, test, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCustomerSession, CUSTOMER_SESSION_KEY } from '../useCustomerSession';

const lucia = { name: 'Lucía Ferrer', email: 'lucia@example.com', phone: '600 123 456' };

describe('useCustomerSession', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('stores the session under agloval_customer_v1', () => {
    expect(CUSTOMER_SESSION_KEY).toBe('agloval_customer_v1');
  });

  test('starts without a customer when nothing is stored', async () => {
    const { result } = renderHook(() => useCustomerSession());
    await act(async () => {});
    expect(result.current.customer).toBeNull();
  });

  test('saves the customer and reads it back on the next mount', async () => {
    const { result, unmount } = renderHook(() => useCustomerSession());
    act(() => result.current.save(lucia));
    expect(result.current.customer).toEqual(lucia);
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(CUSTOMER_SESSION_KEY) ?? 'null')).toEqual(lucia)
    );
    unmount();

    const { result: next } = renderHook(() => useCustomerSession());
    await waitFor(() => expect(next.current.customer).toEqual(lucia));
  });

  test('logout clears the customer', async () => {
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(lucia));
    const { result } = renderHook(() => useCustomerSession());
    await waitFor(() => expect(result.current.customer).toEqual(lucia));

    act(() => result.current.logout());

    expect(result.current.customer).toBeNull();
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(CUSTOMER_SESSION_KEY) ?? 'null')).toBeNull()
    );
  });

  test('ignores corrupt storage', async () => {
    localStorage.setItem(CUSTOMER_SESSION_KEY, '{not json');
    const { result } = renderHook(() => useCustomerSession());
    await waitFor(() => expect(result.current.customer).toBeNull());
  });

  test('ignores a stored value that is not a customer', async () => {
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify({ name: 42, email: 'x' }));
    const { result } = renderHook(() => useCustomerSession());
    await act(async () => {});
    expect(result.current.customer).toBeNull();
  });
});
