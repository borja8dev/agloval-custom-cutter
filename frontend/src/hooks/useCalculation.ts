import { useState } from 'react';
import { Piece, CalculationResponse, CalculationRequest, Product } from '../types';
import { createCalculation } from '../services/api';

interface UseCalculationReturn {
  selectedProduct: Product | null;
  pieces: Piece[];
  calculation: CalculationResponse | null;
  isLoading: boolean;
  error: string | null;

  setSelectedProduct: (product: Product) => void;
  addPiece: (piece: Piece) => void;
  removePiece: (index: number) => void;
  updatePiece: (index: number, piece: Piece) => void;
  calculate: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

export function useCalculation(): UseCalculationReturn {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [calculation, setCalculation] = useState<CalculationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPiece = (piece: Piece) => {
    if (piece.width <= 0 || piece.height <= 0) {
      setError('Piece dimensions must be positive');
      return;
    }

    setPieces((prev) => [...prev, piece]);
    setError(null);
  };

  const removePiece = (index: number) => {
    setPieces((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePiece = (index: number, piece: Piece) => {
    setPieces((prev) => {
      const updated = [...prev];
      updated[index] = piece;
      return updated;
    });
  };

  const calculate = async () => {
    if (!selectedProduct) {
      setError('Please select a product');
      return;
    }

    if (pieces.length === 0) {
      setError('Please add at least one piece');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const request: CalculationRequest = {
        productId: selectedProduct.id,
        requestedPieces: pieces,
        metadata: { source: 'web' }
      };

      const result = await createCalculation(request);
      setCalculation(result);

      try {
        localStorage.setItem('lastCalculation', JSON.stringify(result));
      } catch {
        // Persistence is a non-critical nicety (e.g. Safari private mode blocks it)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setSelectedProduct(null);
    setPieces([]);
    setCalculation(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  return {
    selectedProduct,
    pieces,
    calculation,
    isLoading,
    error,

    setSelectedProduct,
    addPiece,
    removePiece,
    updatePiece,
    calculate,
    reset,
    clearError
  };
}
