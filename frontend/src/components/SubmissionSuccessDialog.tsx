import React from 'react';
import type { HistoryKind } from '../types';
import { Modal } from './Modal';

/** What was just sent: shown in the success window. */
export interface SubmissionSuccess {
  kind: HistoryKind;
  message: string;
}

export interface SubmissionSuccessDialogProps {
  success: SubmissionSuccess | null;
  onClose: () => void;
}

const COPY: Record<HistoryKind, { title: string; note: string }> = {
  quote: {
    title: 'Presupuesto guardado',
    note: 'Agloval no recibe nada: no se pone en marcha ningún pedido.',
  },
  order: {
    title: 'Pedido enviado',
    note: 'Agloval te confirmará disponibilidad y entrega por correo.',
  },
};

/** Confirms, with a tick, that a quote was saved or an order was sent. */
export const SubmissionSuccessDialog: React.FC<SubmissionSuccessDialogProps> = ({
  success,
  onClose,
}) => {
  const copy = success ? COPY[success.kind] : null;
  return (
    <Modal open={success !== null} onClose={onClose} title={copy?.title ?? ''}>
      {success && copy && (
        <div className="flex flex-col items-center gap-4 text-center">
          <span
            data-testid="success-tick"
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600"
          >
            <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <p className="text-base font-medium text-gray-900">{success.message}</p>
          <p className="text-sm text-gray-600">{copy.note}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 rounded-md bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Entendido
          </button>
        </div>
      )}
    </Modal>
  );
};
