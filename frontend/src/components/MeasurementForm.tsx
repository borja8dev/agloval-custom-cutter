import React, { useState } from 'react';
import { Piece } from '../types';

interface MeasurementFormProps {
  onAddPiece: (piece: Piece) => void;
  isLoading?: boolean;
}

export const MeasurementForm: React.FC<MeasurementFormProps> = ({
  onAddPiece,
  isLoading = false
}) => {
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const widthNum = parseFloat(width);
    const heightNum = parseFloat(height);

    if (!width || !height || widthNum <= 0 || heightNum <= 0) {
      setError('Please enter positive dimensions');
      return;
    }

    onAddPiece({ width: widthNum, height: heightNum });

    setWidth('');
    setHeight('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ancho (cm)
          </label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            placeholder="200"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="width-input"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alto (cm)
          </label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="height-input"
            disabled={isLoading}
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        data-testid="add-piece-btn"
      >
        {isLoading ? 'Procesando...' : 'Añadir pieza'}
      </button>
    </form>
  );
};
