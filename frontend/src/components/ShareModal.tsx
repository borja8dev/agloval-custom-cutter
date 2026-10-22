import React, { useEffect, useRef, useState } from 'react';
import { OrderQuote } from '../types';
import { buildOrderText, shareViaWhatsApp, shareViaEmail } from '../services/export';
import { Modal } from './Modal';

interface ShareModalProps {
  quote: OrderQuote;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ quote, onClose }) => {
  const [copyFeedback, setCopyFeedback] = useState<'copied' | 'failed' | null>(null);
  const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => clearTimeout(copyFeedbackTimer.current);
  }, []);

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildOrderText(quote));
      setCopyFeedback('copied');
    } catch {
      setCopyFeedback('failed');
    }
    copyFeedbackTimer.current = setTimeout(() => setCopyFeedback(null), 2000);
  };

  return (
    <Modal open onClose={onClose} title="Compartir presupuesto">
      <div className="space-y-3">
        <button
          className="w-full bg-brand-dark text-white py-2 rounded-lg hover:brightness-90 transition-colors"
          onClick={() => shareViaWhatsApp(quote)}
        >
          Compartir por WhatsApp
        </button>

        <button
          className="w-full bg-white border border-brand-dark text-brand-dark py-2 rounded-lg hover:bg-brand-light transition-colors"
          onClick={() => shareViaEmail(quote)}
        >
          Enviar por email
        </button>

        <button
          className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          onClick={handleCopySummary}
        >
          {copyFeedback === 'copied' && '✓ Resumen copiado'}
          {copyFeedback === 'failed' && 'No se pudo copiar'}
          {!copyFeedback && 'Copiar resumen'}
        </button>
      </div>

      <button
        onClick={onClose}
        className="w-full mt-4 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400 transition-colors"
      >
        Cerrar
      </button>
    </Modal>
  );
};
