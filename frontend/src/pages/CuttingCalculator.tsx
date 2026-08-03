import React from 'react';
import { useProducts } from '../hooks/useProducts';
import { useCalculation } from '../hooks/useCalculation';
import { ProductCard } from '../components/ProductCard';
import { MeasurementForm } from '../components/MeasurementForm';
import { PriceDisplay } from '../components/PriceDisplay';

export const CuttingCalculator: React.FC = () => {
  const { products, isLoading: isLoadingProducts, error: productsError } = useProducts();
  const {
    selectedProduct,
    pieces,
    calculation,
    isLoading,
    error,
    setSelectedProduct,
    addPiece,
    removePiece,
    calculate,
    reset,
    clearError
  } = useCalculation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">
            Calculadora de Corte Personalizado
          </h1>
          <p className="text-blue-100">
            Calcula cuántos tableros necesitas para tus piezas personalizadas
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {(productsError || error) && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">{productsError || error}</p>
            {error && (
              <button
                onClick={clearError}
                className="text-red-600 text-sm mt-2 hover:underline"
              >
                Descartar
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-8">
          <div>
            <h2 className="text-xl font-bold mb-4">1. Selecciona tablero</h2>

            {isLoadingProducts ? (
              <div className="text-center py-8 text-gray-500">
                Cargando productos...
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSelected={selectedProduct?.id === product.id}
                    onSelect={setSelectedProduct}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">2. Añade medidas</h2>

            <div className="space-y-4">
              <MeasurementForm onAddPiece={addPiece} isLoading={isLoading} />

              {pieces.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Piezas ({pieces.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {pieces.map((piece, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-gray-100 p-2 rounded"
                      >
                        <span className="text-sm font-mono">
                          {piece.width} × {piece.height} cm
                        </span>
                        <button
                          onClick={() => removePiece(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduct && pieces.length > 0 && (
                <button
                  onClick={calculate}
                  disabled={isLoading}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 transition-colors mt-4"
                  data-testid="calculate-btn"
                >
                  {isLoading ? 'Calculando...' : 'Calcular'}
                </button>
              )}

              {(selectedProduct || pieces.length > 0) && (
                <button
                  onClick={reset}
                  disabled={isLoading}
                  className="w-full bg-gray-300 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">3. Resultado</h2>
            <PriceDisplay calculation={calculation} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
};
