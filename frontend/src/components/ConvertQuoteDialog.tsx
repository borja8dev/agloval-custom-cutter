import React from 'react';
import type { Customer, HistoryEntry } from '../types';
import type { QuotePricing } from '../hooks/useQuoteConversion';
import { formatDecimal } from '../utils/formatters';
import { Alert } from './Alert';
import { CustomerDetailsForm, type CustomerSubmission } from './CustomerDetailsForm';
import { Modal } from './Modal';

export interface ConvertQuoteDialogProps {
  /** The quote being turned into an order; the window is closed without one. */
  entry: HistoryEntry | null;
  /** Number the new order will get. */
  orderNumber: number;
  pricing: QuotePricing;
  /** Used when the quote has no customer of its own. */
  fallbackCustomer: Customer | null;
  isSending: boolean;
  error: string | null;
  referenceError?: string | null;
  onSubmit: (submission: CustomerSubmission) => void;
  onClose: () => void;
}

const money = (amount: number, currency: string) => `${formatDecimal(amount)} ${currency}`;
const sameCents = (a: number, b: number) => Math.round(a * 100) === Math.round(b * 100);

/** "Pasar a pedido": shows the quote at today's price and sends it as an order. */
export const ConvertQuoteDialog: React.FC<ConvertQuoteDialogProps> = ({
  entry,
  orderNumber,
  pricing,
  fallbackCustomer,
  isSending,
  error,
  referenceError = null,
  onSubmit,
  onClose,
}) => (
  <Modal open={entry !== null} onClose={onClose} title="Pasar a pedido" size="lg">
    {entry && (
      <CustomerDetailsForm
        key={entry.number}
        initialCustomer={entry.customer ?? fallbackCustomer}
        initialReference={entry.reference}
        submitLabel="Enviar pedido a Agloval"
        submitDisabled={pricing.status !== 'ready'}
        isSending={isSending}
        error={error}
        referenceError={referenceError}
        onSubmit={onSubmit}
        onCancel={onClose}
      >
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-1">
          <p className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold text-gray-900">Presupuesto nº {entry.number}</span>
            <span className="text-sm font-medium text-brand-dark">
              Se enviará como pedido nº {orderNumber}
            </span>
          </p>
          {entry.customer && <p className="text-sm text-gray-700">{entry.customer.name}</p>}
          {entry.reference && <p className="text-sm text-gray-700">Ref. {entry.reference}</p>}
          <p aria-live="polite" className="font-bold text-gray-900 tabular-nums">
            {pricing.status === 'ready'
              ? `Total: ${money(pricing.quote.total, pricing.quote.currency)}`
              : pricing.status === 'loading'
                ? 'Calculando el precio actual...'
                : ''}
          </p>
        </div>
        {pricing.status === 'ready' && !sameCents(pricing.quote.total, entry.total) && (
          <p
            role="status"
            className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            El precio ha cambiado desde el presupuesto: antes {money(entry.total, entry.currency)},
            ahora {money(pricing.quote.total, pricing.quote.currency)}. Se enviará con el precio
            actual.
          </p>
        )}
        {pricing.status === 'missing' && (
          <Alert
            type="warning"
            message={`No se puede pasar a pedido: estos productos ya no existen: ${pricing.names.join(', ')}`}
          />
        )}
        {pricing.status === 'error' && <Alert type="error" message={pricing.message} />}
      </CustomerDetailsForm>
    )}
  </Modal>
);
