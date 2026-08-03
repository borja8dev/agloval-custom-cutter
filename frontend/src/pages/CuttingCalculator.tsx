import React, { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { useCalculation } from '../hooks/useCalculation';
import { useCalculationHistory } from '../hooks/useCalculationHistory';
import { getProduct } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import { MeasurementForm } from '../components/MeasurementForm';
import { PiecesList } from '../components/PiecesList';
import { PriceDisplay } from '../components/PriceDisplay';
import { AreaVisualizer } from '../components/AreaVisualizer';
import { CartPreview } from '../components/CartPreview';
import { CalculationHistory } from '../components/CalculationHistory';
import { Alert } from '../components/Alert';
import { ExportButton } from '../components/ExportButton';
import { CalculationResponse } from '../types';

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
    updatePiece,
    calculate,
    loadFromHistory,
    reset,
    clearError
  } = useCalculation();

  const {
    history,
    isLoading: isLoadingHistory,
    addItem,
    removeItem
  } = useCalculationHistory();

  const [view, setView] = useState<'calculator' | 'history'>('calculator');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null);
  const [isLoadingHistoryItem, setIsLoadingHistoryItem] = useState(false);

  const handleCalculate = async () => {
    const result = await calculate();
    if (result) {
      addItem(result);
      setSuccessMessage('Cálculo guardado en histórico');
    }
  };

  const handleLoadFromHistory = async (calc: CalculationResponse) => {
    if (isLoadingHistoryItem) return;

    setHistoryLoadError(null);
    setIsLoadingHistoryItem(true);
    try {
      const product = await getProduct(calc.product.id);
      loadFromHistory(product, calc);
      setView('calculator');
    } catch {
      setHistoryLoadError('No se pudo cargar este cálculo: el producto ya no está disponible.');
    } finally {
      setIsLoadingHistoryItem(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white py-6 sm:py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
              Calculadora de Corte Personalizado
            </h1>
            <p className="text-blue-100 text-sm sm:text-base">
              Calcula cuántos tableros necesitas para tus piezas personalizadas
            </p>
          </div>

          <button
            onClick={() => setView(view === 'calculator' ? 'history' : 'calculator')}
            className="self-start sm:self-auto bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            {view === 'calculator' ? `📋 Historial (${history.length})` : '← Volver a calcular'}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {productsError && <Alert type="error" message={productsError} />}

        {error && <Alert type="error" message={error} onClose={clearError} />}

        {historyLoadError && (
          <div className="mt-4">
            <Alert
              type="error"
              message={historyLoadError}
              onClose={() => setHistoryLoadError(null)}
            />
          </div>
        )}

        {successMessage && (
          <div className="mt-4">
            <Alert
              type="success"
              message={successMessage}
              onClose={() => setSuccessMessage(null)}
              autoClose
            />
          </div>
        )}

        {view === 'history' ? (
          <div className="max-w-2xl mx-auto mt-6">
            <CalculationHistory
              calculations={history}
              onSelect={handleLoadFromHistory}
              onDelete={removeItem}
              isLoading={isLoadingHistory || isLoadingHistoryItem}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-6">
            <div>
              <h2 className="text-xl font-bold mb-4">1. Selecciona tablero</h2>

              {isLoadingProducts ? (
                <div className="text-center py-8 text-gray-500">Cargando productos...</div>
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

                <PiecesList
                  pieces={pieces}
                  onRemove={removePiece}
                  onUpdate={updatePiece}
                  isLoading={isLoading}
                />

                {selectedProduct && pieces.length > 0 && (
                  <button
                    onClick={handleCalculate}
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

            <div className="space-y-4">
              <h2 className="text-xl font-bold">3. Resultado</h2>
              <PriceDisplay calculation={calculation} isLoading={isLoading} />
              {calculation && !isLoading && <AreaVisualizer calculation={calculation} />}
              <CartPreview
                product={selectedProduct}
                calculation={calculation}
                isLoading={isLoading}
              />
              {calculation && !isLoading && <ExportButton calculation={calculation} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
