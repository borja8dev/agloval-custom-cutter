import React, { useEffect, useRef, useState } from 'react';
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
import { AppHeader } from '../components/AppHeader';
import { Modal } from '../components/Modal';
import { OrderBar } from '../components/OrderBar';
import { formatDecimal } from '../utils/formatters';
import type { CatalogProduct, OrderHistoryEntry } from '../types';

const SEARCH_DEBOUNCE_MS = 300;

type OrderStatus = { kind: 'success' | 'warning'; message: string };

const cardClass = 'bg-white rounded-lg shadow-md p-4 sm:p-6';
const headingClass = 'text-xl font-bold mb-4';
const statusClass = {
  success: 'bg-green-50 text-green-800 border-green-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
};

export const CuttingCalculator: React.FC = () => {
  const [family, setFamily] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { families, isLoading: isLoadingFamilies, error: familiesError } = useFamilies();
  const {
    catalogProducts,
    total,
    isLoading: isLoadingProducts,
    error: productsError,
  } = useProducts(family || undefined, debouncedQuery);

  const order = useOrder();
  const { quote, isLoading: isQuoting, error: quoteError } = useOrderQuote(order.toQuoteRequest());
  const { history, addOrder, removeOrder, clearHistory, nextNumber } = useOrderHistory();
  const orderHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // The new order number is read back from the history once it has been saved.
  useEffect(() => {
    if (confirmPending && history.length > 0) {
      setOrderStatus({ kind: 'success', message: `Pedido #${history[0].number} guardado` });
      setConfirmPending(false);
    }
  }, [confirmPending, history]);

  const handleConfirm = () => {
    if (!quote || order.lines.length === 0) return;
    addOrder(quote, order.lines);
    order.clear();
    setOrderStatus(null);
    setConfirmPending(true);
  };

  const showOrder = () => {
    const heading = orderHeadingRef.current;
    heading?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    heading?.focus({ preventScroll: true });
  };

  const handleReorder = async (entry: OrderHistoryEntry) => {
    if (isReordering) return;
    setIsReordering(true);
    setOrderStatus(null);
    try {
      const { lines, missing } = await reorderFromHistory(entry);
      if (lines.length > 0) {
        order.replaceLines(lines);
      }
      setHistoryOpen(false);
      if (missing.length === 0) {
        setOrderStatus({
          kind: 'success',
          message: `Pedido #${entry.number} cargado en el pedido actual`,
        });
      } else {
        const names = missing.join(', ');
        setOrderStatus({
          kind: 'warning',
          message:
            lines.length > 0
              ? `Pedido #${entry.number} cargado, pero estos productos ya no existen: ${names}`
              : `No se pudo cargar el pedido #${entry.number}: estos productos ya no existen: ${names}`,
        });
      }
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <>
      <AppHeader
        actions={
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setHistoryOpen(true)}
            className="bg-white text-brand-dark font-semibold rounded-full px-4 py-2 text-sm hover:bg-brand-light focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-header"
          >
            Historial ({history.length})
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="min-w-0 space-y-6">
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
        </div>

        <aside
          aria-labelledby="block-order"
          className="min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh_-_3rem)] lg:flex lg:flex-col"
        >
          <section
            aria-labelledby="block-order"
            className={`${cardClass} lg:flex lg:flex-col lg:min-h-0 lg:flex-1 border-t-4 border-brand`}
          >
            <h2
              id="block-order"
              ref={orderHeadingRef}
              tabIndex={-1}
              className={`${headingClass} scroll-mt-4 focus:outline-none`}
            >
              3. Pedido actual
            </h2>
            <div className="space-y-3 lg:flex lg:flex-col lg:min-h-0 lg:flex-1">
              <div role="status" aria-live="polite">
                {orderStatus && (
                  <p className={`text-sm border rounded-md p-2 ${statusClass[orderStatus.kind]}`}>
                    {orderStatus.message}
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
                orderNumber={nextNumber}
              />
              <div className="flex justify-end">
                <ExportButton quote={quote} />
              </div>
            </div>
          </section>
        </aside>
      </div>

      {order.lines.length > 0 && (
        <OrderBar
          orderNumber={nextNumber}
          lineCount={order.lines.length}
          totalText={quote ? `${formatDecimal(quote.total)} EUR` : '--'}
          onShowOrder={showOrder}
        />
      )}

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Historial de pedidos"
        size="lg"
      >
        <OrderHistory
          history={history}
          onReorder={handleReorder}
          onRemove={removeOrder}
          onClear={clearHistory}
          isReordering={isReordering}
          hideTitle
        />
      </Modal>
    </>
  );
};
