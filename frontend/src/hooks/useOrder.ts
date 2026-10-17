import { useCallback, useMemo, useState } from 'react';
import type { CatalogProduct, OrderLine, OrderPiece, QuoteRequest } from '../types';
import {
  addPiece,
  addQuantity,
  countsByProduct as computeCounts,
  removeLine as removeLineFrom,
  removePiece as removePieceFrom,
  toQuoteRequest as buildQuoteRequest,
  updatePiece as updatePieceIn,
  updateQuantity as updateQuantityIn
} from '../utils/order';

interface UseOrderReturn {
  lines: OrderLine[];
  countsByProduct: Record<string, number>;
  addPieces: (product: CatalogProduct, piece: OrderPiece) => void;
  addQuantity: (product: CatalogProduct, quantity: number) => void;
  updatePiece: (lineId: string, index: number, piece: OrderPiece) => void;
  removePiece: (lineId: string, index: number) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
  replaceLines: (lines: OrderLine[]) => void;
  toQuoteRequest: () => QuoteRequest;
}

export function useOrder(): UseOrderReturn {
  const [lines, setLines] = useState<OrderLine[]>([]);

  const addPieces = useCallback(
    (product: CatalogProduct, piece: OrderPiece) =>
      setLines((prev) => addPiece(prev, product, piece)),
    []
  );
  const addQty = useCallback(
    (product: CatalogProduct, quantity: number) =>
      setLines((prev) => addQuantity(prev, product, quantity)),
    []
  );
  const updatePiece = useCallback(
    (lineId: string, index: number, piece: OrderPiece) =>
      setLines((prev) => updatePieceIn(prev, lineId, index, piece)),
    []
  );
  const removePiece = useCallback(
    (lineId: string, index: number) => setLines((prev) => removePieceFrom(prev, lineId, index)),
    []
  );
  const updateQuantity = useCallback(
    (lineId: string, quantity: number) =>
      setLines((prev) => updateQuantityIn(prev, lineId, quantity)),
    []
  );
  const removeLine = useCallback(
    (lineId: string) => setLines((prev) => removeLineFrom(prev, lineId)),
    []
  );
  const clear = useCallback(() => setLines([]), []);
  const replaceLines = useCallback((next: OrderLine[]) => setLines(next), []);

  const countsByProduct = useMemo(() => computeCounts(lines), [lines]);
  const toQuoteRequest = useCallback(() => buildQuoteRequest(lines), [lines]);

  return {
    lines,
    countsByProduct,
    addPieces,
    addQuantity: addQty,
    updatePiece,
    removePiece,
    updateQuantity,
    removeLine,
    clear,
    replaceLines,
    toQuoteRequest
  };
}
