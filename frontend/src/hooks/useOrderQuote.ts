import { useEffect, useState } from 'react';
import type { OrderQuote, QuoteRequest } from '../types';
import { quoteOrder, getErrorMessage } from '../services/api';

export const QUOTE_DEBOUNCE_MS = 300;

interface UseOrderQuoteReturn {
  quote: OrderQuote | null;
  isLoading: boolean;
  error: string | null;
}

export function useOrderQuote(
  request: QuoteRequest,
  debounceMs: number = QUOTE_DEBOUNCE_MS
): UseOrderQuoteReturn {
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Callers rebuild the request object on every render; compare by content.
  const requestKey = JSON.stringify(request);

  useEffect(() => {
    const current = JSON.parse(requestKey) as QuoteRequest;

    if (current.lines.length === 0) {
      setQuote(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Cleanup flips this flag, so only the latest request may update the state.
    let active = true;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      quoteOrder(current, controller.signal)
        .then((result) => {
          if (!active) return;
          setQuote(result);
          setIsLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          setQuote(null);
          setError(getErrorMessage(err, 'Failed to calculate the order'));
          setIsLoading(false);
        });
    }, debounceMs);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [requestKey, debounceMs]);

  return { quote, isLoading, error };
}
