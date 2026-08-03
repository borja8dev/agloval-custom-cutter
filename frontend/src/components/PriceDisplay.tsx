import React from 'react';
import { CalculationResponse } from '../types';

interface PriceDisplayProps {
  calculation: CalculationResponse | null;
  isLoading?: boolean;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  calculation,
  isLoading = false
}) => {
  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Calculando...</div>;
  }

  if (!calculation) {
    return null;
  }

  const { pricing, calculation: calc } = calculation;

  return (
    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 space-y-4">
      <h2 className="text-2xl font-bold text-green-900">Resultado del cálculo</h2>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Área necesaria</p>
          <p className="text-xl font-bold">{calc.totalAreaNeeded.toFixed(2)} m²</p>
        </div>
        <div>
          <p className="text-gray-600">Tableros necesarios</p>
          <p className="text-xl font-bold text-orange-600">
            {calc.boardsNeeded.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Desperdicio</p>
          <p className="text-xl font-bold">{calc.wastePercentage.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-gray-600">Precio/tablero</p>
          <p className="text-xl font-bold">€{pricing.pricePerBoard.toFixed(2)}</p>
        </div>
      </div>

      <div className="border-t-2 border-green-200 pt-4"></div>

      <div className="text-center">
        <p className="text-gray-600 mb-1">Precio total</p>
        <p className="text-4xl font-bold text-green-600">
          €{pricing.totalPrice.toFixed(2)}
        </p>
        <p className="text-xs text-gray-500 mt-1">{pricing.currency}</p>
      </div>

      {calculation.metadata.validUntilDays && (
        <div className="text-xs text-gray-600 text-center">
          ✓ Presupuesto válido {calculation.metadata.validUntilDays} días
        </div>
      )}
    </div>
  );
};
