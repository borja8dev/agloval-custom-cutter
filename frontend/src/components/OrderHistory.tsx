import React, { useState } from 'react';
import type { OrderHistoryEntry } from '../types';
import { formatDate, formatDecimal } from '../utils/formatters';
import { QuoteGroupList } from './QuoteGroupList';

interface OrderHistoryProps {
  history: OrderHistoryEntry[];
  onReorder: (entry: OrderHistoryEntry) => void;
  onRemove: (number: number) => void;
  onClear: () => void;
  status?: { kind: 'success' | 'warning'; message: string } | null;
  isReordering?: boolean;
  /** Hides the own title when the container (for example a dialog) already shows one. */
  hideTitle?: boolean;
}

const statusStyles = {
  success: 'bg-green-50 text-green-800 border-green-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
};

const HistoryRow: React.FC<{
  entry: OrderHistoryEntry;
  onReorder: (entry: OrderHistoryEntry) => void;
  onRemove: (number: number) => void;
  isReordering: boolean;
}> = ({ entry, onReorder, onRemove, isReordering }) => {
  const [expanded, setExpanded] = useState(false);
  const panelId = `order-history-panel-${entry.number}`;

  return (
    <li data-testid="history-entry" className="border border-gray-200 rounded-lg p-3 space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="min-w-0">
          <span className="block font-semibold text-gray-900">Pedido #{entry.number}</span>
          <span className="block text-xs text-gray-500">{formatDate(entry.createdAt)}</span>
        </span>
        <span className="font-bold text-green-600 shrink-0">
          {formatDecimal(entry.total)} {entry.currency}
        </span>
      </button>

      {expanded && (
        <div id={panelId}>
          <QuoteGroupList groups={entry.groups} />
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onReorder(entry)}
          disabled={isReordering}
          className="flex-1 bg-blue-600 text-white py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Volver a pedir
        </button>
        <button
          type="button"
          onClick={() => onRemove(entry.number)}
          aria-label={`Eliminar pedido #${entry.number}`}
          className="px-3 py-1.5 border border-gray-300 text-red-600 rounded-md text-sm font-medium hover:bg-red-50"
        >
          Eliminar
        </button>
      </div>
    </li>
  );
};

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  history,
  onReorder,
  onRemove,
  onClear,
  status = null,
  isReordering = false,
  hideTitle = false,
}) => {
  const [confirmingClear, setConfirmingClear] = useState(false);

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-4 space-y-3">
      <div className={`flex items-center gap-2 ${hideTitle ? 'justify-end' : 'justify-between'}`}>
        {!hideTitle && (
          <h3 className="text-lg font-semibold text-gray-900">Historial de pedidos</h3>
        )}
        {history.length > 0 &&
          (confirmingClear ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmingClear(false);
                  onClear();
                }}
                className="text-sm text-white bg-red-600 px-3 py-1 rounded-md font-medium hover:bg-red-700"
              >
                Confirmar vaciado
              </button>
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="text-sm text-gray-700 border border-gray-300 px-3 py-1 rounded-md font-medium"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Vaciar historial
            </button>
          ))}
      </div>

      <div aria-live="polite">
        {status && (
          <p className={`text-sm border rounded-md p-2 ${statusStyles[status.kind]}`}>
            {status.message}
          </p>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-center text-gray-600 py-6">Todavía no hay pedidos</p>
      ) : (
        <ul data-testid="order-history" className="max-h-96 overflow-y-auto space-y-2">
          {history.map((entry) => (
            <HistoryRow
              key={entry.number}
              entry={entry}
              onReorder={onReorder}
              onRemove={onRemove}
              isReordering={isReordering}
            />
          ))}
        </ul>
      )}
    </div>
  );
};
