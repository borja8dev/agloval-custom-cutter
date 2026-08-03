import React from 'react';
import { CalculationResponse, Product } from '../types';
import { formatCurrency, formatArea } from '../utils/formatters';

interface CartPreviewProps {
  product: Product | null;
  calculation: CalculationResponse | null;
  onExport?: () => void;
  onShare?: () => void;
  isLoading?: boolean;
}

export const CartPreview: React.FC<CartPreviewProps> = ({
  product,
  calculation,
  onExport,
  onShare,
  isLoading = false
}) => {
  if (!product || !calculation) {
    return null;
  }

  const { pricing, calculation: calc } = calculation;

  return (
    <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
      <h3 className="font-bold text-lg mb-3">Resumen de compra</h3>

      <div className="pb-3 border-b">
        <p className="text-sm text-gray-600">{product.categoryName}</p>
        <p className="font-semibold">{product.name}</p>
      </div>

      <div className="py-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Área necesaria</span>
          <span className="font-mono">{formatArea(calc.totalAreaNeeded)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Tableros necesarios</span>
          <span className="font-mono font-bold text-orange-600">
            {calc.boardsNeeded.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Desperdicio</span>
          <span className="font-mono">{calc.wastePercentage.toFixed(1)}%</span>
        </div>
      </div>

      <div className="border-t my-3"></div>

      <div className="bg-green-50 p-3 rounded-lg mb-4">
        <p className="text-sm text-gray-600 mb-1">Precio total</p>
        <p className="text-3xl font-bold text-green-600">
          {formatCurrency(pricing.totalPrice, pricing.currency)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {pricing.boardsNeeded.toFixed(1)} tableros ×{' '}
          {formatCurrency(pricing.pricePerBoard, pricing.currency)}
        </p>
      </div>

      <div className="space-y-2">
        {onExport && (
          <button
            onClick={onExport}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm"
          >
            📥 Descargar PDF
          </button>
        )}

        {onShare && (
          <button
            onClick={onShare}
            disabled={isLoading}
            className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300 disabled:bg-gray-400 transition-colors text-sm"
          >
            🔗 Compartir
          </button>
        )}
      </div>

      {calculation.metadata.validUntilDays && (
        <p className="text-xs text-gray-500 text-center mt-3">
          ✓ Oferta válida {calculation.metadata.validUntilDays} días
        </p>
      )}
    </div>
  );
};
