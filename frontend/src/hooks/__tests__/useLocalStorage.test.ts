import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should load existing data from localStorage on mount', async () => {
    localStorage.setItem('test-key', JSON.stringify(['seeded']));

    const { result } = renderHook(() => useLocalStorage<string[]>('test-key', []));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(['seeded']);
  });

  test('should never overwrite existing data with the initial value before loading completes', async () => {
    localStorage.setItem('test-key', JSON.stringify(['seeded']));
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const { result } = renderHook(() => useLocalStorage<string[]>('test-key', []));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const wipedExistingData = setItemSpy.mock.calls.some(
      ([key, value]) => key === 'test-key' && value === JSON.stringify([])
    );
    expect(wipedExistingData).toBe(false);

    setItemSpy.mockRestore();
  });

  test('should persist updates via setData', async () => {
    const { result } = renderHook(() => useLocalStorage<string[]>('test-key', []));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setData(['item1']);
    });

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('test-key') || '[]')).toEqual(['item1'])
    );
  });
});
