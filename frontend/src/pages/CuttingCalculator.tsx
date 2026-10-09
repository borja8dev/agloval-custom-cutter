import React, { useEffect, useState } from 'react';
import { useFamilies } from '../hooks/useFamilies';
import { useProducts } from '../hooks/useProducts';
import { useOrder } from '../hooks/useOrder';
import { useOrderQuote } from '../hooks/useOrderQuote';
import { useOrderHistory } from '../hooks/useOrderHistory';
import { reorderFromHistory } from '../services/reorder';
import { FamilySelect } from '../components/FamilySelect';
import { ProductList } from '../components/ProductList';
import { OrderLineForm } from '../components/OrderLineForm';
import { OrderSummary } from '../components/OrderSummary';
import { OrderHistory } from '../components/OrderHistory';
import { ExportButton } from '../components/ExportButton';
import { Alert } from '../components/Alert';
import type { CatalogProduct, OrderHistoryEntry } from '../types';

const SEARCH_DEBOUNCE_MS = 300;

type HistoryStatus = { kind: 'success' | 'warning'; message: string };

const cardClass = 'bg-white rounded-lg shadow-md p-4 sm:p-6';
const headingClass = 'text-xl font-bold mb-4';

export const CuttingCalculator: React.FC = () => {
  const [family, setFamily] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const { families, isLoading: isLoadingFamilies, error: familiesError } = useFamilies();
  const {
    catalogProducts,
    total,
    isLoading: isLoadingProducts,
    error: productsError
  } = useProducts(family || undefined, debouncedQuery);

  const order = useOrder();
  const { quote, isLoading: isQuoting, error: quoteError } = useOrderQuote(order.toQuoteRequest());
  const { history, addOrder, removeOrder, clearHistory } = useOrderHistory();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // The new order number is read back from the history once it has been saved.
  useEffect(() => {
    if (confirmPending && history.length > 0) {
      setSavedMessage(`Pedido #${history[0].number} guardado`);
      setConfirmPending(false);
    }
  }, [confirmPending, history]);

  const handleConfirm = () => {
    if (!quote || order.lines.length === 0) return;
    addOrder(quote, order.lines);
    order.clear();
    setHistoryStatus(null);
    setConfirmPending(true);
  };

  const handleReorder = async (entry: OrderHistoryEntry) => {
    if (isReordering) return;
    setIsReordering(true);
    setSavedMessage(null);
    try {
      const { lines, missing } = await reorderFromHistory(entry);
      if (lines.length > 0) {
        order.replaceLines(lines);
      }
      if (missing.length === 0) {
        setHistoryStatus({
          kind: 'success',
          message: `Pedido #${entry.number} cargado en el pedido actual`
        });
      } else {
        const names = missing.join(', ');
        setHistoryStatus({
          kind: 'warning',
          message:
            lines.length > 0
              ? `Pedido #${entry.number} cargado, pero estos productos ya no existen: ${names}`
              : `No se pudo cargar el pedido #${entry.number}: estos productos ya no existen: ${names}`
        });
      }
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white py-6 sm:py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
            Calculadora de Corte Personalizado
          </h1>
          <p className="text-blue-100 text-sm sm:text-base">
            Calcula tu pedido de tableros, unidades y barras
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <section aria-labelledby="block-products" className={cardClass}>
          <h2 id="block-products" className={headingClass}>
            1. Selecciona producto
          </h2>
          <div className="space-y-4">
            {familiesError && <Alert type="error" message={familiesError} />}
            <FamilySelect
              families={families}
              value={family}
              onChange={setFamily}
              isLoading={isLoadingFamilies}
            />
            <ProductList
              products={catalogProducts}
              selectedId={selectedProduct?.id ?? null}
              onSelect={setSelectedProduct}
              countsByProduct={order.countsByProduct}
              isLoading={isLoadingProducts}
              error={productsError}
              query={query}
              onQueryChange={setQuery}
              total={total}
            />
          </div>
        </section>

        <section aria-labelledby="block-line" className={cardClass}>
          <h2 id="block-line" className={headingClass}>
            2. Medidas y cantidad
          </h2>
          <OrderLineForm
            product={selectedProduct}
            onAddPiece={(piece) => selectedProduct && order.addPieces(selectedProduct, piece)}
            onAddQuantity={(quantity) =>
              selectedProduct && order.addQuantity(selectedProduct, quantity)
            }
          />
        </section>

        <section aria-labelledby="block-order" className={cardClass}>
          <h2 id="block-order" className={headingClass}>
            3. Pedido actual
          </h2>
          <div className="space-y-3">
            <div role="status" aria-live="polite">
              {savedMessage && (
                <p className="text-sm border rounded-md p-2 bg-green-50 text-green-800 border-green-200">
                  {savedMessage}
                </p>
              )}
            </div>
            <OrderSummary
              lines={order.lines}
              quote={quote}
              isLoading={isQuoting}
              error={quoteError}
              onUpdatePiece={order.updatePiece}
              onRemovePiece={order.removePiece}
              onUpdateQuantity={order.updateQuantity}
              onRemoveLine={order.removeLine}
              onConfirm={handleConfirm}
              onClear={order.clear}
            />
            <div className="flex justify-end">
              <ExportButton quote={quote} />
            </div>
          </div>
        </section>

        <section aria-labelledby="block-history" className={cardClass}>
          <h2 id="block-history" className={headingClass}>
            4. Historial
          </h2>
          <OrderHistory
            history={history}
            onReorder={handleReorder}
            onRemove={removeOrder}
            onClear={clearHistory}
            status={historyStatus}
            isReordering={isReordering}
          />
        </section>
      </div>
    </div>
  );
};
