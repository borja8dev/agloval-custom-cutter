import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFamilies } from '../hooks/useFamilies';
import { useProducts } from '../hooks/useProducts';
import { useOrder } from '../hooks/useOrder';
import { useOrderQuote } from '../hooks/useOrderQuote';
import { useOrderHistory } from '../hooks/useOrderHistory';
import { useQuoteHistory } from '../hooks/useQuoteHistory';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { UseCustomerSessionReturn } from '../hooks/useCustomerSession';
import { reorderFromHistory } from '../services/reorder';
import { getErrorMessage, getFieldError, submitOrder, submitQuote } from '../services/api';
import { FamilySelect } from '../components/FamilySelect';
import { ProductList } from '../components/ProductList';
import { OrderLineForm } from '../components/OrderLineForm';
import { OrderSummary } from '../components/OrderSummary';
import { ExportButton } from '../components/ExportButton';
import { Alert } from '../components/Alert';
import { Modal } from '../components/Modal';
import { OrderBar } from '../components/OrderBar';
import { ConfirmSubmissionForm, type Submission } from '../components/ConfirmSubmissionForm';
import { formatDecimal } from '../utils/formatters';
import type { CatalogProduct, HistoryEntry, ReorderRequest } from '../types';

const SEARCH_DEBOUNCE_MS = 300;

type OrderStatus = { kind: 'success' | 'warning'; message: string };

const cardClass = 'bg-white rounded-lg shadow-md p-4 sm:p-6';
const headingClass = 'text-xl font-bold mb-4';
const statusClass = {
  success: 'bg-green-50 text-green-800 border-green-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
};
const ENTRY_LABEL = { quote: 'Presupuesto', order: 'Pedido' } as const;

function toReorderRequest(state: unknown): ReorderRequest | null {
  if (typeof state !== 'object' || state === null) return null;
  const { reorder, kind } = state as Record<string, unknown>;
  if (typeof reorder !== 'number' || (kind !== 'quote' && kind !== 'order')) return null;
  return { reorder, kind };
}

interface CuttingCalculatorProps {
  /** Shared with the header, so the greeting updates as soon as an order is sent. */
  session: UseCustomerSessionReturn;
}

export const CuttingCalculator: React.FC<CuttingCalculatorProps> = ({ session }) => {
  useDocumentTitle('Gestor de pedidos · Agloval');
  const [family, setFamily] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  const { families, isLoading: isLoadingFamilies, error: familiesError } = useFamilies();
  const {
    catalogProducts,
    total,
    isLoading: isLoadingProducts,
    error: productsError,
  } = useProducts(family || undefined, debouncedQuery);

  const order = useOrder();
  const { quote, isLoading: isQuoting, error: quoteError } = useOrderQuote(order.toQuoteRequest());
  const orderHistory = useOrderHistory();
  const quoteHistory = useQuoteHistory();
  const orderHeadingRef = useRef<HTMLHeadingElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const handledRequestKey = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const handleConfirm = () => {
    if (!quote || order.lines.length === 0) return;
    setSubmitError(null);
    setReferenceError(null);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    if (!isSubmitting) setDetailsOpen(false);
  };

  // A quote only goes to the customer; an order also goes to Agloval.
  const handleSubmitDetails = async ({ kind, customer, reference }: Submission) => {
    const confirmedQuote = quote;
    if (isSubmitting || !confirmedQuote) return;
    const lines = order.lines;
    const requestLines = order.toQuoteRequest().lines;
    const details = reference ? { customer, reference } : { customer };
    setIsSubmitting(true);
    setSubmitError(null);
    setReferenceError(null);
    try {
      let message: string;
      if (kind === 'quote') {
        const quoteNumber = quoteHistory.nextNumber;
        await submitQuote({ quoteNumber, ...details, privacyAccepted: true, lines: requestLines });
        quoteHistory.add(confirmedQuote, lines, details);
        message = `Presupuesto nº ${quoteNumber} enviado. Te lo hemos mandado a ${customer.email}.`;
      } else {
        const orderNumber = orderHistory.nextNumber;
        await submitOrder({ orderNumber, ...details, privacyAccepted: true, lines: requestLines });
        orderHistory.add(confirmedQuote, lines, details);
        message = `Pedido nº ${orderNumber} enviado a Agloval. Te hemos mandado una copia a ${customer.email}.`;
      }
      session.save(customer);
      order.clear();
      setDetailsOpen(false);
      setOrderStatus({ kind: 'success', message });
    } catch (err) {
      const fieldMessage = getFieldError(err, 'reference');
      if (fieldMessage) {
        setReferenceError(fieldMessage);
      } else {
        setSubmitError(getErrorMessage(err, 'No se pudo enviar. Inténtalo de nuevo.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const showOrder = () => {
    const heading = orderHeadingRef.current;
    heading?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    heading?.focus({ preventScroll: true });
  };

  const handleReorder = async (entry: HistoryEntry) => {
    if (isReordering) return;
    setIsReordering(true);
    setOrderStatus(null);
    const label = `${ENTRY_LABEL[entry.kind]} #${entry.number}`;
    try {
      const { lines, missing } = await reorderFromHistory(entry);
      if (lines.length > 0) {
        order.replaceLines(lines);
      }
      if (missing.length === 0) {
        setOrderStatus({
          kind: 'success',
          message: `${label} cargado en el pedido actual`,
        });
      } else {
        const names = missing.join(', ');
        setOrderStatus({
          kind: 'warning',
          message:
            lines.length > 0
              ? `${label} cargado, pero estos productos ya no existen: ${names}`
              : `No se pudo cargar el ${label.toLowerCase()}: estos productos ya no existen: ${names}`,
        });
      }
    } finally {
      setIsReordering(false);
    }
  };

  // A history page sends { reorder, kind } as router state; handle it once and clear it.
  const reorderRequest = toReorderRequest(location.state);
  useEffect(() => {
    if (!reorderRequest || handledRequestKey.current === location.key) return;
    handledRequestKey.current = location.key;
    navigate('.', { replace: true, state: null });

    const entries = reorderRequest.kind === 'quote' ? quoteHistory.entries : orderHistory.entries;
    const entry = entries.find((e) => e.number === reorderRequest.reorder);
    if (!entry) return;
    if (order.lines.length > 0 && !window.confirm('¿Reemplazar el pedido actual?')) return;
    void handleReorder(entry);
  });

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="block-products" className={cardClass}>
            <h2 id="block-products" className={headingClass}>
              Selecciona producto
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
              Medidas y cantidad
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
              Pedido actual
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
                isConfirming={isSubmitting}
                onClear={order.clear}
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
          lineCount={order.lines.length}
          totalText={quote ? `${formatDecimal(quote.total)} EUR` : '--'}
          onShowOrder={showOrder}
        />
      )}

      <Modal open={detailsOpen} onClose={closeDetails} title="Confirmar envío" size="lg">
        <ConfirmSubmissionForm
          quoteNumber={quoteHistory.nextNumber}
          orderNumber={orderHistory.nextNumber}
          lineCount={order.lines.length}
          totalText={quote ? `${formatDecimal(quote.total)} EUR` : '--'}
          initialCustomer={session.customer}
          isSending={isSubmitting}
          error={submitError}
          referenceError={referenceError}
          onSubmit={handleSubmitDetails}
          onCancel={closeDetails}
        />
      </Modal>
    </>
  );
};
