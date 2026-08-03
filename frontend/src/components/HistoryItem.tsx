import React from 'react';
import { CalculationResponse } from '../types';
import { formatCurrency, formatTimeAgo } from '../utils/formatters';

interface HistoryItemProps {
  calculation: CalculationResponse;
  onSelect: () => void;
  onDelete: () => void;
  isLoading?: boolean;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({
  calculation,
  onSelect,
  onDelete,
  isLoading = false
}) => {
  return (
    <div
      className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onSelect}
      data-testid={`history-item-${calculation.id}`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{calculation.product.name}</p>
        <p className="text-sm text-gray-600">
          {calculation.calculation.pieceCount} pieza(s) •{' '}
          {formatTimeAgo(calculation.metadata.calculatedAt)}
        </p>
      </div>

      <div className="flex items-center gap-4 ml-4">
        <div className="text-right">
          <p className="font-bold text-green-600">
            {formatCurrency(calculation.pricing.totalPrice, calculation.pricing.currency)}
          </p>
          <p className="text-xs text-gray-500">
            {calculation.calculation.boardsNeeded.toFixed(1)} tableros
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isLoading}
          className="text-red-600 hover:text-red-800 text-sm font-medium disabled:text-gray-400"
          title="Eliminar"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
