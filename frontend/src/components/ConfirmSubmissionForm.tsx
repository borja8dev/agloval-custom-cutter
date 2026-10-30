import React, { useId, useState } from 'react';
import type { Customer, HistoryKind } from '../types';
import { CustomerDetailsForm, type CustomerSubmission } from './CustomerDetailsForm';

/** A confirmed submission: what to send, and who it is for. */
export interface Submission extends CustomerSubmission {
  kind: HistoryKind;
}

export interface ConfirmSubmissionFormProps {
  /** Number the quote will get if the customer sends a quote. */
  quoteNumber: number;
  /** Number the order will get if the customer sends an order. */
  orderNumber: number;
  lineCount: number;
  totalText: string;
  initialCustomer: Customer | null;
  isSending: boolean;
  error: string | null;
  referenceError?: string | null;
  onSubmit: (submission: Submission) => void;
  onCancel: () => void;
}

const OPTIONS: Record<
  HistoryKind,
  { title: string; text: string; submitLabel: string }
> = {
  quote: {
    title: 'Presupuesto',
    text: 'Te lo enviamos por correo para que lo revises o se lo enseñes a tu cliente. Agloval no recibe nada todavía.',
    submitLabel: 'Enviarme el presupuesto',
  },
  order: {
    title: 'Pedido',
    text: 'Agloval recibe tu pedido y te confirma disponibilidad y entrega por correo.',
    submitLabel: 'Enviar pedido a Agloval',
  },
};
const KINDS: HistoryKind[] = ['quote', 'order'];

const CheckIcon: React.FC = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
);

/** "Confirmar envío": choose a quote or an order, then the customer's details. */
export const ConfirmSubmissionForm: React.FC<ConfirmSubmissionFormProps> = ({
  quoteNumber,
  orderNumber,
  lineCount,
  totalText,
  initialCustomer,
  isSending,
  error,
  referenceError = null,
  onSubmit,
  onCancel,
}) => {
  const baseId = useId();
  const [kind, setKind] = useState<HistoryKind>('quote');
  const numbers: Record<HistoryKind, number> = { quote: quoteNumber, order: orderNumber };
  const legendId = `${baseId}-legend`;
  const lines = lineCount === 1 ? '1 línea' : `${lineCount} líneas`;

  return (
    <CustomerDetailsForm
      initialCustomer={initialCustomer}
      submitLabel={OPTIONS[kind].submitLabel}
      isSending={isSending}
      error={error}
      referenceError={referenceError}
      onSubmit={(details) => onSubmit({ kind, ...details })}
      onCancel={onCancel}
    >
      <div className="space-y-2">
        <p id={legendId} className="text-sm font-semibold text-gray-900">
          ¿Qué quieres enviar?
        </p>
        <div
          role="radiogroup"
          aria-labelledby={legendId}
          className="grid gap-3 sm:grid-cols-2"
        >
          {KINDS.map((option) => {
            const copy = OPTIONS[option];
            const selected = kind === option;
            const titleId = `${baseId}-${option}-title`;
            const numberId = `${baseId}-${option}-number`;
            const textId = `${baseId}-${option}-text`;
            return (
              <label
                key={option}
                data-selected={selected}
                className={`relative block cursor-pointer rounded-lg border-2 p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2 has-[:disabled]:cursor-not-allowed ${
                  selected
                    ? 'border-brand bg-brand-light'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={`${baseId}-kind`}
                  value={option}
                  checked={selected}
                  disabled={isSending}
                  onChange={() => setKind(option)}
                  aria-labelledby={titleId}
                  aria-describedby={`${numberId} ${textId}`}
                  className="sr-only"
                />
                <span className="flex items-start justify-between gap-2">
                  <span id={titleId} className="font-semibold text-gray-900">
                    {copy.title}
                  </span>
                  <span className={selected ? 'text-brand-dark' : 'text-gray-300'}>
                    <CheckIcon />
                  </span>
                </span>
                <span id={numberId} className="block text-sm font-medium text-brand-dark">
                  {copy.title} nº {numbers[option]}
                </span>
                <span id={textId} className="mt-1 block text-sm text-gray-700">
                  {copy.text}
                </span>
              </label>
            );
          })}
        </div>
      </div>
      <p className="rounded-md bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 tabular-nums">
        {lines} · {totalText}
      </p>
    </CustomerDetailsForm>
  );
};
