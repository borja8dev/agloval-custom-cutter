import { describe, expect, test } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrder } from '../useOrder';
import { isBoardLine } from '../../utils/order';
import { m2Product, udProduct, mlProduct, sampleLines } from '../../test/fixtures';

describe('useOrder', () => {
  test('starts empty', () => {
    const { result } = renderHook(() => useOrder());
    expect(result.current.lines).toEqual([]);
    expect(result.current.countsByProduct).toEqual({});
    expect(result.current.toQuoteRequest()).toEqual({ lines: [] });
  });

  test('addPieces merges identical pieces into the product line', () => {
    const { result } = renderHook(() => useOrder());
    act(() => result.current.addPieces(m2Product, { width: 100, height: 80, quantity: 2 }));
    act(() => result.current.addPieces(m2Product, { width: 100, height: 80, quantity: 3 }));
    expect(result.current.lines).toHaveLength(1);
    const line = result.current.lines[0];
    expect(isBoardLine(line) && line.pieces).toEqual([{ width: 100, height: 80, quantity: 5 }]);
    expect(result.current.countsByProduct).toEqual({ p_m2: 5 });
  });

  test('two additions in the same tick are both kept', () => {
    const { result } = renderHook(() => useOrder());
    act(() => {
      result.current.addQuantity(udProduct, 2);
      result.current.addQuantity(udProduct, 3);
    });
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.countsByProduct).toEqual({ p_ud: 5 });
  });

  test('removing the last piece removes the M2 line', () => {
    const { result } = renderHook(() => useOrder());
    act(() => result.current.addPieces(m2Product, { width: 10, height: 20, quantity: 1 }));
    const lineId = result.current.lines[0].id;
    act(() => result.current.removePiece(lineId, 0));
    expect(result.current.lines).toEqual([]);
  });

  test('updatePiece, updateQuantity and removeLine act on the right line', () => {
    const { result } = renderHook(() => useOrder());
    act(() => {
      result.current.addPieces(m2Product, { width: 10, height: 20, quantity: 1 });
      result.current.addQuantity(mlProduct, 4);
    });
    const [board, linear] = result.current.lines;
    act(() => result.current.updatePiece(board.id, 0, { width: 11, height: 22, quantity: 2 }));
    act(() => result.current.updateQuantity(linear.id, 9));
    expect(result.current.countsByProduct).toEqual({ p_m2: 2, p_ml: 9 });
    act(() => result.current.removeLine(board.id));
    expect(result.current.lines.map((l) => l.id)).toEqual([linear.id]);
  });

  test('toQuoteRequest reflects the current lines', () => {
    const { result } = renderHook(() => useOrder());
    act(() => {
      result.current.addPieces(m2Product, { width: 10, height: 20, quantity: 3 });
      result.current.addQuantity(udProduct, 12);
    });
    expect(result.current.toQuoteRequest()).toEqual({
      lines: [
        { productId: 'p_m2', pieces: [{ width: 10, height: 20, quantity: 3 }] },
        { productId: 'p_ud', quantity: 12 }
      ]
    });
  });

  test('replaceLines swaps the whole order and clear empties it', () => {
    const { result } = renderHook(() => useOrder());
    act(() => result.current.addQuantity(mlProduct, 1));
    act(() => result.current.replaceLines(sampleLines));
    expect(result.current.lines).toEqual(sampleLines);
    act(() => result.current.clear());
    expect(result.current.lines).toEqual([]);
  });
});
