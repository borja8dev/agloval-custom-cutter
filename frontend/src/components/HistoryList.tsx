import React, { useState } from 'react';
import type { HistoryEntry, HistoryKind } from '../types';
import { formatDate, formatDecimal } from '../utils/formatters';
import { QuoteGroupList } from './QuoteGroupList';

interface HistoryListProps {
  kind: HistoryKind;
  entries: HistoryEntry[];
  onRepeat: (entry: HistoryEntry) => void;
  onRemove: (number: number) => void;
}

const ENTRY_LABEL: Record<HistoryKind, string> = {
  quote: 'Presupuesto',
  order: 'Pedido',
};

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

const badgeClass =
  'inline-block rounded-full bg-brand-light text-brand-dark text-xs font-semibold px-2 py-0.5';

function stateBadge(entry: HistoryEntry): string | null {
  if (entry.kind === 'quote' && entry.convertedToOrder !== undefined) {
    return `Convertido en pedido nº ${entry.convertedToOrder}`;
  }
  if (entry.kind === 'order' && entry.fromQuoteNumber !== undefined) {
    return `Desde presupuesto nº ${entry.fromQuoteNumber}`;
  }
  return null;
}

const HistoryCard: React.FC<{
  entry: HistoryEntry;
  label: string;
  onRepeat: (entry: HistoryEntry) => void;
  onRemove: (number: number) => void;
}> = ({ entry, label, onRepeat, onRemove }) => {
  const [expanded, setExpanded] = useState(false);
  const panelId = `history-panel-${entry.kind}-${entry.number}`;
  const title = `${label} nº ${entry.number}`;
  const badge = stateBadge(entry);

  return (
    <li
      data-testid="history-entry"
      className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3"
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={`w-full flex flex-wrap items-start justify-between gap-2 text-left rounded-md ${focusRing}`}
      >
        <span className="min-w-0">
          <span className="block font-semibold text-gray-900">{title}</span>
          <span className="block text-xs text-gray-500">{formatDate(entry.createdAt)}</span>
        </span>
        <span className="font-bold text-brand-dark shrink-0">
          {formatDecimal(entry.total)} {entry.currency}
        </span>
      </button>

      {(entry.customer || entry.reference || badge) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-700">
          {entry.customer && <span className="break-words">{entry.customer.name}</span>}
          {entry.reference && <span className="break-words">Ref. {entry.reference}</span>}
          {badge && <span className={badgeClass}>{badge}</span>}
        </div>
      )}

      {expanded && (
        <div id={panelId}>
          <QuoteGroupList groups={entry.groups} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onRepeat(entry)}
          className={`flex-1 bg-brand-dark text-white py-1.5 px-3 rounded-md text-sm font-medium hover:brightness-90 ${focusRing}`}
        >
          Repetir
        </button>
        <button
          type="button"
          onClick={() => onRemove(entry.number)}
          aria-label={`Eliminar ${title.toLowerCase()}`}
          className={`px-3 py-1.5 border border-gray-300 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 ${focusRing}`}
        >
          Eliminar
        </button>
      </div>
    </li>
  );
};

/** Presentational list of saved quotes or orders, newest first as given. */
export const HistoryList: React.FC<HistoryListProps> = ({ kind, entries, onRepeat, onRemove }) => (
  <ul data-testid="history-list" className="grid gap-3 md:grid-cols-2 md:items-start">
    {entries.map((entry) => (
      <HistoryCard
        key={entry.number}
        entry={entry}
        label={ENTRY_LABEL[kind]}
        onRepeat={onRepeat}
        onRemove={onRemove}
      />
    ))}
  </ul>
);
