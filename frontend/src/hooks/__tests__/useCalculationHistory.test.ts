import { describe, expect, test, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCalculationHistory } from '../useCalculationHistory';
import { CalculationResponse } from '../../types';

function makeCalculation(id: string): CalculationResponse {
  return {
    id,
    product: { id: 'prod_1', name: 'Test Product', categoryName: 'Test' },
    board: { width: 300, height: 200, thickness: 18, area: 6 },
    requestedPieces: [{ width: 100, height: 100 }],
    calculation: {
      totalAreaNeeded: 1,
      boardsNeeded: 1,
      wastePercentage: 10,
      pieceCount: 1,
      averagePieceSize: 1
    },
    pricing: { pricePerBoard: 50, boardsNeeded: 1, totalPrice: 50, currency: 'EUR' },
    metadata: { calculatedAt: new Date().toISOString(), status: 'DRAFT' }
  };
}

describe('useCalculationHistory Hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should initialize empty', async () => {
    const { result } = renderHook(() => useCalculationHistory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.history).toEqual([]);
  });

  test('should prepend new items', async () => {
    const { result } = renderHook(() => useCalculationHistory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addItem(makeCalculation('calc_1'));
    });
    act(() => {
      result.current.addItem(makeCalculation('calc_2'));
    });

    expect(result.current.history.map((c) => c.id)).toEqual(['calc_2', 'calc_1']);
  });

  test('should cap history at 50 items', async () => {
    const { result } = renderHook(() => useCalculationHistory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      for (let i = 0; i < 55; i++) {
        result.current.addItem(makeCalculation(`calc_${i}`));
      }
    });

    expect(result.current.history).toHaveLength(50);
  });

  test('should remove an item by id', async () => {
    const { result } = renderHook(() => useCalculationHistory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addItem(makeCalculation('calc_1'));
      result.current.addItem(makeCalculation('calc_2'));
    });

    act(() => {
      result.current.removeItem('calc_1');
    });

    expect(result.current.history.map((c) => c.id)).toEqual(['calc_2']);
  });
});
