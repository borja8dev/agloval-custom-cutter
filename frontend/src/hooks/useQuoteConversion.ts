import { useEffect, useState } from 'react';
import type { HistoryEntry, OrderLine, OrderQuote } from '../types';
import { getErrorMessage, quoteOrder } from '../services/api';
import { reorderFromHistory } from '../services/reorder';
import { toQuoteRequest } from '../utils/order';

/** Current price of a saved quote, rebuilt with today's products. */
export type QuotePricing =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; lines: OrderLine[]; quote: OrderQuote }
  | { status: 'missing'; names: string[] }
  | { status: 'error'; message: string };

export function useQuoteConversion(entry: HistoryEntry | null): QuotePricing {
  const [pricing, setPricing] = useState<QuotePricing>({ status: 'idle' });

  useEffect(() => {
    if (!entry) {
      setPricing({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setPricing({ status: 'loading' });

    const reprice = async () => {
      try {
        const { lines, missing } = await reorderFromHistory(entry);
        if (cancelled) return;
        if (missing.length > 0) {
          setPricing({ status: 'missing', names: missing });
          return;
        }
        const quote = await quoteOrder(toQuoteRequest(lines));
        if (!cancelled) setPricing({ status: 'ready', lines, quote });
      } catch (err) {
        if (!cancelled) {
          setPricing({
            status: 'error',
            message: getErrorMessage(err, 'No se pudo calcular el precio actual.'),
          });
        }
      }
    };
    void reprice();

    return () => {
      cancelled = true;
    };
  }, [entry]);

  return pricing;
}
