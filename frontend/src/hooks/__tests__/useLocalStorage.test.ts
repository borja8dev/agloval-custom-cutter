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

  test('should follow changes made to its key in another tab', async () => {
    const { result } = renderHook(() => useLocalStorage<string[]>('test-key', []));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      localStorage.setItem('other-key', JSON.stringify(['ignored']));
      window.dispatchEvent(new StorageEvent('storage', { key: 'other-key' }));
    });
    expect(result.current.data).toEqual([]);

    act(() => {
      localStorage.setItem('test-key', JSON.stringify(['from other tab']));
      window.dispatchEvent(new StorageEvent('storage', { key: 'test-key' }));
    });
    expect(result.current.data).toEqual(['from other tab']);

    // Removed (or whole storage cleared) elsewhere: back to the initial value.
    act(() => {
      localStorage.removeItem('test-key');
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
    });
    expect(result.current.data).toEqual([]);
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
