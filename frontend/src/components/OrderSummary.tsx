import React, { useEffect, useState } from 'react';
import type { OrderLine, OrderPiece, OrderQuote } from '../types';
import { MAX_LINE_QUANTITY, MAX_PIECE_QUANTITY } from '../constants';
import { isBoardLine } from '../utils/order';
import { formatDecimal } from '../utils/formatters';
import { useAnimatedNumber, useChangeHighlight } from '../hooks/useAnimatedNumber';
import { Alert } from './Alert';
import { QuoteGroupList } from './QuoteGroupList';

interface OrderSummaryProps {
  lines: OrderLine[];
  quote: OrderQuote | null;
  isLoading?: boolean;
  error?: string | null;
  onUpdatePiece: (lineId: string, index: number, piece: OrderPiece) => void;
  onRemovePiece: (lineId: string, index: number) => void;
  onUpdateQuantity: (lineId: string, quantity: number) => void;
  onRemoveLine: (lineId: string) => void;
  onConfirm: () => void;
  onClear: () => void;
  isConfirming?: boolean;
}

// Short colour cue when the total changes; amounts keep a readable contrast.
const trendClass = {
  up: 'bg-green-50 text-green-800',
  down: 'bg-amber-50 text-amber-800',
  none: 'text-gray-900',
};

const removeButtonClass = 'text-sm text-red-600 hover:text-red-800 font-medium';

// Number input that keeps a local draft and commits it on blur or Enter.
// Invalid values (not an integer within range) restore the last good value.
const QuantityInput: React.FC<{
  value: number;
  max: number;
  label: string;
  onCommit: (value: number) => void;
}> = ({ value, max, label, onCommit }) => {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = draft.trim() === '' ? NaN : Number(draft);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
      setDraft(String(value));
      return;
    }
    if (parsed !== value) {
      onCommit(parsed);
    }
  };

  return (
    <input
      type="number"
      min={1}
      max={max}
      value={draft}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
      }}
      className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand"
    />
  );
};

const LineItem: React.FC<{
  line: OrderLine;
  quote: OrderQuote | null;
  onUpdatePiece: OrderSummaryProps['onUpdatePiece'];
  onRemovePiece: OrderSummaryProps['onRemovePiece'];
  onUpdateQuantity: OrderSummaryProps['onUpdateQuantity'];
  onRemoveLine: OrderSummaryProps['onRemoveLine'];
}> = ({ line, quote, onUpdatePiece, onRemovePiece, onUpdateQuantity, onRemoveLine }) => {
  const groups = quote ? quote.groups.filter((g) => g.product.id === line.product.id) : [];

  return (
    <section
      data-testid="order-line"
      aria-label={line.product.name}
      className="border border-gray-200 rounded-lg p-3 space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 break-words">{line.product.name}</p>
          <p className="text-xs text-gray-500">{line.product.sku}</p>
        </div>
        {!isBoardLine(line) && (
          <div className="flex items-center gap-2 shrink-0">
            <QuantityInput
              value={line.quantity}
              max={MAX_LINE_QUANTITY}
              label={`Cantidad de ${line.product.name}`}
              onCommit={(q) => onUpdateQuantity(line.id, q)}
            />
            <button
              type="button"
              className={removeButtonClass}
              onClick={() => onRemoveLine(line.id)}
            >
              Eliminar línea
            </button>
          </div>
        )}
      </div>

      {isBoardLine(line) && (
        <ul className="space-y-1">
          {line.pieces.map((piece, index) => (
            <li
              key={`${piece.width}x${piece.height}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="flex items-center gap-2">
                {piece.width} x {piece.height} cm x
                <QuantityInput
                  value={piece.quantity}
                  max={MAX_PIECE_QUANTITY}
                  label={`Cantidad de piezas ${piece.width} x ${piece.height} cm`}
                  onCommit={(q) =>
                    onUpdatePiece(line.id, index, {
                      width: piece.width,
                      height: piece.height,
                      quantity: q,
                    })
                  }
                />
              </span>
              <button
                type="button"
                className={removeButtonClass}
                onClick={() => onRemovePiece(line.id, index)}
              >
                Eliminar pieza
              </button>
            </li>
          ))}
        </ul>
      )}

      <QuoteGroupList groups={groups} showProductName={false} />
    </section>
  );
};

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  lines,
  quote,
  isLoading = false,
  error = null,
  onUpdatePiece,
  onRemovePiece,
  onUpdateQuantity,
  onRemoveLine,
  onConfirm,
  onClear,
  isConfirming = false,
}) => {
  const isEmpty = lines.length === 0;
  const canConfirm = !isEmpty && quote !== null && !isLoading && !isConfirming;
  const hasTotal = quote !== null || isEmpty;
  const totalValue = quote ? quote.total : 0;
  const animatedTotal = useAnimatedNumber(totalValue);
  const trend = useChangeHighlight(totalValue);
  const totalText = hasTotal ? `${formatDecimal(totalValue)} EUR` : '--';
  const displayedText = hasTotal ? `${formatDecimal(animatedTotal)} EUR` : '--';
  // The number depends on sending a quote or an order, so the panel shows none.
  const lineCountText = lines.length === 1 ? '1 línea' : `${lines.length} líneas`;

  return (
    <div className="w-full bg-white rounded-lg shadow-md flex flex-col lg:flex-1 lg:min-h-0">
      <div className="p-4 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-lg font-bold text-brand-dark">Tu pedido</h3>
          {!isEmpty && <p className="text-sm text-gray-500">{lineCountText}</p>}
        </div>
        <p aria-live="polite" className="text-xs text-gray-500">
          {isLoading ? 'Calculando...' : ''}
        </p>
      </div>

      {error && (
        <div className="px-4 pb-2">
          <Alert type="error" message={error} />
        </div>
      )}

      <div
        data-testid="order-lines"
        className="max-h-96 overflow-y-auto px-4 space-y-3 lg:max-h-none lg:flex-1 lg:min-h-0"
      >
        {isEmpty ? (
          <div className="text-center text-gray-600 py-6">
            <p className="font-medium">El pedido está vacío</p>
            <p className="text-sm">Elige un producto y añádelo al pedido.</p>
          </div>
        ) : (
          lines.map((line) => (
            <LineItem
              key={line.id}
              line={line}
              quote={quote}
              onUpdatePiece={onUpdatePiece}
              onRemovePiece={onRemovePiece}
              onUpdateQuantity={onUpdateQuantity}
              onRemoveLine={onRemoveLine}
            />
          ))
        )}
      </div>

      <div className="shrink-0 sticky bottom-0 bg-white border-t border-gray-200 rounded-b-lg p-4 space-y-3">
        <p
          data-testid="order-total"
          aria-hidden="true"
          data-trend={trend ?? undefined}
          className={`text-xl font-bold rounded-md -mx-2 px-2 py-0.5 tabular-nums transition-colors duration-500 ${trendClass[trend ?? 'none']}`}
        >
          Total: {displayedText}
        </p>
        <p data-testid="order-total-live" aria-live="polite" className="sr-only">
          Total del pedido: {totalText}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex-1 bg-brand-dark text-white py-2 rounded-md font-medium hover:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isConfirming ? 'Confirmando...' : 'Confirmar'}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={isEmpty}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md font-medium hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Vaciar pedido
          </button>
        </div>
      </div>
    </div>
  );
};
