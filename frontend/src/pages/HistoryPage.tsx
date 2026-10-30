import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HistoryList } from '../components/HistoryList';
import { useHistory } from '../hooks/useHistory';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { HistoryEntry, HistoryKind, ReorderRequest } from '../types';

interface HistoryPageProps {
  kind: HistoryKind;
}

const COPY: Record<
  HistoryKind,
  { title: string; intro: string; empty: string; one: string; many: string }
> = {
  quote: {
    title: 'Historial de presupuestos',
    intro: 'Los presupuestos guardados en este navegador. Repite uno para cargarlo en el gestor.',
    empty: 'Todavía no hay presupuestos',
    one: 'presupuesto',
    many: 'presupuestos',
  },
  order: {
    title: 'Historial de pedidos',
    intro: 'Los pedidos enviados desde este navegador. Repite uno para cargarlo en el gestor.',
    empty: 'Todavía no hay pedidos',
    one: 'pedido',
    many: 'pedidos',
  },
};

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

// Lower case without diacritics, so "LUCIA" finds "Lucía".
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function matches(entry: HistoryEntry, query: string): boolean {
  const haystack = [String(entry.number), entry.customer?.name ?? '', entry.reference ?? '']
    .map(normalize)
    .join('\n');
  return haystack.includes(query);
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ kind }) => {
  const copy = COPY[kind];
  useDocumentTitle(`${copy.title} · Agloval`);
  const history = useHistory(kind);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [confirmingClear, setConfirmingClear] = useState(false);

  const normalizedQuery = normalize(query.trim());
  const visible = useMemo(
    () =>
      normalizedQuery
        ? history.entries.filter((entry) => matches(entry, normalizedQuery))
        : history.entries,
    [history.entries, normalizedQuery]
  );

  const countText =
    visible.length === 0
      ? 'Sin resultados'
      : `${visible.length} ${visible.length === 1 ? copy.one : copy.many}`;

  const handleRepeat = (entry: HistoryEntry) => {
    const state: ReorderRequest = { reorder: entry.number, kind };
    navigate('/', { state });
  };

  const titleId = `history-title-${kind}`;
  const searchId = `history-search-${kind}`;

  return (
    <section aria-labelledby={titleId} className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id={titleId} className="text-2xl font-bold text-gray-900">
            {copy.title}
          </h2>
          <p className="text-gray-600">{copy.intro}</p>
        </div>
        {history.entries.length > 0 &&
          (confirmingClear ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmingClear(false);
                  history.clear();
                }}
                className={`text-sm text-white bg-red-600 px-3 py-1.5 rounded-md font-medium hover:bg-red-700 ${focusRing}`}
              >
                Confirmar vaciado
              </button>
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className={`text-sm text-gray-700 bg-white border border-gray-300 px-3 py-1.5 rounded-md font-medium ${focusRing}`}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className={`text-sm text-red-600 hover:text-red-800 font-medium px-2 py-1.5 rounded-md ${focusRing}`}
            >
              Vaciar historial
            </button>
          ))}
      </div>

      {history.entries.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center space-y-4">
          <p className="text-gray-600">{copy.empty}</p>
          <Link
            to="/"
            className={`inline-block bg-brand-dark text-white font-semibold rounded-full px-5 py-2 hover:brightness-90 ${focusRing}`}
          >
            Ir al gestor de pedidos
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label htmlFor={searchId} className="block text-sm font-medium text-gray-700">
              Buscar por número, cliente o referencia
            </label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full sm:max-w-md border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
            <p aria-live="polite" className="text-sm text-gray-600">
              {countText}
            </p>
          </div>
          <HistoryList
            kind={kind}
            entries={visible}
            onRepeat={handleRepeat}
            onRemove={history.remove}
          />
        </>
      )}
    </section>
  );
};
