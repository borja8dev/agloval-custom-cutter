import React, { useEffect, useState } from 'react';
import { Piece } from '../types';
import { formatDimensions, formatArea } from '../utils/formatters';

interface PiecesListProps {
  pieces: Piece[];
  onRemove: (index: number) => void;
  onUpdate: (index: number, piece: Piece) => void;
  isLoading?: boolean;
}

export const PiecesList: React.FC<PiecesListProps> = ({
  pieces,
  onRemove,
  onUpdate,
  isLoading = false
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Piece>({ width: 0, height: 0 });

  // Removing/adding a piece shifts indices — an in-progress edit no longer
  // points at the row the user opened, so cancel it rather than risk saving
  // over the wrong piece.
  useEffect(() => {
    setEditingIndex(null);
  }, [pieces.length]);

  const handleStartEdit = (index: number, piece: Piece) => {
    setEditingIndex(index);
    setEditValues({ ...piece });
  };

  const handleSaveEdit = (index: number) => {
    if (editValues.width > 0 && editValues.height > 0) {
      onUpdate(index, editValues);
      setEditingIndex(null);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
  };

  if (pieces.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        Aún no hay piezas. Añade una arriba.
      </div>
    );
  }

  const totalArea = pieces.reduce((sum, p) => sum + (p.width * p.height) / 10000, 0);

  return (
    <div className="space-y-2">
      {pieces.map((piece, index) => (
        <div
          key={index}
          className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
          data-testid={`piece-item-${index}`}
        >
          {editingIndex !== index ? (
            <>
              <div className="flex-1">
                <div className="font-mono font-semibold text-gray-900">
                  {formatDimensions(piece.width, piece.height)}
                </div>
                <div className="text-xs text-gray-500">
                  Área: {formatArea((piece.width * piece.height) / 10000)}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleStartEdit(index, piece)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  disabled={isLoading}
                >
                  Editar
                </button>
                <button
                  onClick={() => onRemove(index)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                  disabled={isLoading}
                >
                  Quitar
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-2 flex-1">
                <input
                  type="number"
                  value={editValues.width}
                  onChange={(e) =>
                    setEditValues({ ...editValues, width: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Ancho"
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  disabled={isLoading}
                />
                <span className="text-gray-500 self-center">×</span>
                <input
                  type="number"
                  value={editValues.height}
                  onChange={(e) =>
                    setEditValues({ ...editValues, height: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Alto"
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveEdit(index)}
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                  disabled={isLoading}
                >
                  Guardar
                </button>
                <button
                  onClick={handleCancel}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      <div className="bg-gray-50 p-3 rounded-lg mt-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-gray-600">Total piezas</p>
            <p className="font-bold">{pieces.length}</p>
          </div>
          <div>
            <p className="text-gray-600">Área total</p>
            <p className="font-bold">{formatArea(totalArea)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
