import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../../services/api', () => ({
  getFamilies: vi.fn(),
  getErrorMessage: (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)
}));

import { getFamilies } from '../../services/api';
import { useFamilies } from '../useFamilies';

const mocked = vi.mocked(getFamilies);
const families = [{ code: 'MEL', name: 'Melamina', productCount: 3, units: { UD: 0, M2: 3, ML: 0 } }];

describe('useFamilies', () => {
  beforeEach(() => {
    mocked.mockReset();
  });

  test('loads once and exposes the families', async () => {
    mocked.mockResolvedValue(families);
    const { result, rerender } = renderHook(() => useFamilies());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender();
    expect(result.current.families).toEqual(families);
    expect(result.current.error).toBeNull();
    expect(mocked).toHaveBeenCalledTimes(1);
  });

  test('exposes the error message and no families on failure', async () => {
    mocked.mockRejectedValue(new Error('sin conexion'));
    const { result } = renderHook(() => useFamilies());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('sin conexion');
    expect(result.current.families).toEqual([]);
  });

  test('does not update state after unmount', async () => {
    let resolve!: (v: typeof families) => void;
    mocked.mockReturnValue(new Promise((r) => (resolve = r)));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderHook(() => useFamilies());
    unmount();
    resolve(families);
    await Promise.resolve();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
