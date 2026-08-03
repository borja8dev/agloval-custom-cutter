import React from 'react';
import { CalculationResponse } from '../types';

interface AreaVisualizerProps {
  calculation: CalculationResponse | null;
}

export const AreaVisualizer: React.FC<AreaVisualizerProps> = ({ calculation }) => {
  if (!calculation) {
    return null;
  }

  const { board, calculation: calc } = calculation;
  const boardAspectRatio = board.width / board.height;

  // wastePercentage is already "% of purchased area unused" (backend-computed),
  // so usage is simply its complement — no need to recompute from board.area.
  const usagePercentage = 100 - calc.wastePercentage;
  // Side length (%) of a corner-anchored inner box whose AREA equals usagePercentage%
  // of the outer box's area: side = sqrt(area fraction) * 100.
  const sidePercentage = Math.sqrt(usagePercentage / 100) * 100;

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-semibold mb-3 text-sm">Visualización de uso</h4>

      <div
        className="bg-white border-4 border-gray-400 rounded mb-3 flex items-center justify-center relative overflow-hidden"
        style={{
          aspectRatio: boardAspectRatio,
          backgroundColor: '#f5f5f5'
        }}
      >
        <div
          className="absolute inset-0 bg-green-300 opacity-60"
          style={{
            width: `${sidePercentage}%`,
            height: `${sidePercentage}%`
          }}
        ></div>

        <div className="relative z-10 text-center">
          <p className="font-bold text-gray-900">{usagePercentage.toFixed(0)}%</p>
          <p className="text-xs text-gray-600">Utilización</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-300 rounded"></div>
          <span>Área utilizada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <span>Desperdicio</span>
        </div>
      </div>

      <p className="text-xs text-gray-600 mt-3">
        Necesitas <span className="font-bold">{calc.boardsNeeded.toFixed(1)}</span> tableros
        para obtener <span className="font-bold">{calc.totalAreaNeeded.toFixed(2)} m²</span>
      </p>
    </div>
  );
};
