import { useState } from 'react';
import { Piece, CalculationResponse, CalculationRequest, Product } from '../types';
import { createCalculation, getErrorMessage } from '../services/api';

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
  calculate: () => Promise<CalculationResponse | null>;
  loadFromHistory: (product: Product, calc: CalculationResponse) => void;
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

  const calculate = async (): Promise<CalculationResponse | null> => {
    if (!selectedProduct) {
      setError('Please select a product');
      return null;
    }

    if (pieces.length === 0) {
      setError('Please add at least one piece');
      return null;
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
      return result;
    } catch (err) {
      setError(getErrorMessage(err, 'Calculation failed. Please try again.'));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromHistory = (product: Product, calc: CalculationResponse) => {
    setSelectedProduct(product);
    setPieces(calc.requestedPieces);
    setCalculation(calc);
    setError(null);
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
    loadFromHistory,
    reset,
    clearError
  };
}
