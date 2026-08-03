import { describe, expect, test } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalculation } from '../useCalculation';
import { Product } from '../../types';

describe('useCalculation Hook', () => {
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
});
