import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalculation } from '../useCalculation';
import { Product, CalculationResponse } from '../../types';
import { createCalculation } from '../../services/api';

vi.mock('../../services/api', () => ({
  createCalculation: vi.fn()
}));

describe('useCalculation Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProduct: Product = {
    id: 'prod_1',
    name: 'Test Product',
    categoryName: 'Test',
    standardWidth: 300,
    standardHeight: 200,
    thickness: 18,
    pricePerUnit: 100,
    currency: 'EUR'
  };

  const mockCalculationResponse: CalculationResponse = {
    id: 'calc_1',
    product: { id: 'prod_1', name: 'Test Product', categoryName: 'Test' },
    board: { width: 300, height: 200, thickness: 18, area: 6 },
    requestedPieces: [{ width: 200, height: 100 }],
    calculation: {
      totalAreaNeeded: 2,
      boardsNeeded: 1,
      wastePercentage: 66.7,
      pieceCount: 1,
      averagePieceSize: 2
    },
    pricing: { pricePerBoard: 100, boardsNeeded: 1, totalPrice: 100, currency: 'EUR' },
    metadata: { calculatedAt: new Date().toISOString(), status: 'DRAFT' }
  };

  test('should initialize with empty state', () => {
    const { result } = renderHook(() => useCalculation());

    expect(result.current.selectedProduct).toBeNull();
    expect(result.current.pieces).toEqual([]);
    expect(result.current.calculation).toBeNull();
    expect(result.current.error).toBeNull();
  });

  test('should set selected product', () => {
    const { result } = renderHook(() => useCalculation());

    act(() => {
      result.current.setSelectedProduct(mockProduct);
    });

    expect(result.current.selectedProduct).toEqual(mockProduct);
  });

  test('should add a piece', () => {
    const { result } = renderHook(() => useCalculation());

    act(() => {
      result.current.addPiece({ width: 200, height: 100 });
    });

    expect(result.current.pieces).toHaveLength(1);
    expect(result.current.pieces[0]).toEqual({ width: 200, height: 100 });
  });

  test('should reject invalid piece', () => {
    const { result } = renderHook(() => useCalculation());

    act(() => {
      result.current.addPiece({ width: 0, height: 100 });
    });

    expect(result.current.pieces).toHaveLength(0);
    expect(result.current.error).toBeTruthy();
  });

  test('should remove a piece', () => {
    const { result } = renderHook(() => useCalculation());

    act(() => {
      result.current.addPiece({ width: 200, height: 100 });
      result.current.addPiece({ width: 150, height: 150 });
    });

    expect(result.current.pieces).toHaveLength(2);

    act(() => {
      result.current.removePiece(0);
    });

    expect(result.current.pieces).toHaveLength(1);
    expect(result.current.pieces[0]).toEqual({ width: 150, height: 150 });
  });

  test('should update a piece', () => {
    const { result } = renderHook(() => useCalculation());

    act(() => {
      result.current.addPiece({ width: 200, height: 100 });
    });

    act(() => {
      result.current.updatePiece(0, { width: 250, height: 120 });
    });

    expect(result.current.pieces[0]).toEqual({ width: 250, height: 120 });
  });

  test('should reset state', () => {
    const { result } = renderHook(() => useCalculation());

    act(() => {
      result.current.setSelectedProduct(mockProduct);
      result.current.addPiece({ width: 100, height: 100 });
    });

    expect(result.current.selectedProduct).not.toBeNull();
    expect(result.current.pieces).toHaveLength(1);

    act(() => {
      result.current.reset();
    });

    expect(result.current.selectedProduct).toBeNull();
    expect(result.current.pieces).toEqual([]);
    expect(result.current.calculation).toBeNull();
  });

  test('should return null and set an error when calculating without a product', async () => {
    const { result } = renderHook(() => useCalculation());

    let returned: CalculationResponse | null = mockCalculationResponse;
    await act(async () => {
      returned = await result.current.calculate();
    });

    expect(returned).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(createCalculation).not.toHaveBeenCalled();
  });

  test('should return the fresh calculation result so callers do not rely on stale state', async () => {
    vi.mocked(createCalculation).mockResolvedValueOnce(mockCalculationResponse);

    const { result } = renderHook(() => useCalculation());

    act(() => {
      result.current.setSelectedProduct(mockProduct);
      result.current.addPiece({ width: 200, height: 100 });
    });

    let returned: CalculationResponse | null = null;
    await act(async () => {
      returned = await result.current.calculate();
    });

    expect(returned).toEqual(mockCalculationResponse);
    expect(result.current.calculation).toEqual(mockCalculationResponse);
  });

  test('should load a full state from history without calling the API', async () => {
    const { result } = renderHook(() => useCalculation());

    act(() => {
      result.current.loadFromHistory(mockProduct, mockCalculationResponse);
    });

    expect(result.current.selectedProduct).toEqual(mockProduct);
    expect(result.current.pieces).toEqual(mockCalculationResponse.requestedPieces);
    expect(result.current.calculation).toEqual(mockCalculationResponse);
    expect(createCalculation).not.toHaveBeenCalled();
  });
});
