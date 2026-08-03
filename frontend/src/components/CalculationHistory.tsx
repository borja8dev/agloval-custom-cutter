import React from 'react';
import { CalculationResponse } from '../types';
import { HistoryItem } from './HistoryItem';

interface CalculationHistoryProps {
  calculations: CalculationResponse[];
  onSelect: (calc: CalculationResponse) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export const CalculationHistory: React.FC<CalculationHistoryProps> = ({
  calculations,
  onSelect,
  onDelete,
  isLoading = false
}) => {
  if (calculations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No hay histórico de cálculos</p>
        <p className="text-sm mt-1">Los cálculos se guardarán automáticamente</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-bold text-lg mb-4">Histórico de cálculos</h3>

      {calculations.map((calc) => (
        <HistoryItem
          key={calc.id}
          calculation={calc}
          onSelect={() => onSelect(calc)}
          onDelete={() => onDelete(calc.id)}
          isLoading={isLoading}
        />
      ))}

      <p className="text-xs text-gray-500 text-center mt-4">
        Se guardan los últimos 50 cálculos
      </p>
    </div>
  );
};
