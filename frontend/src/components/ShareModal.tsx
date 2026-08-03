import React, { useEffect, useRef, useState } from 'react';
import { CalculationResponse } from '../types';
import { generateShareUrl, shareViaWhatsApp, shareViaEmail } from '../services/export';

interface ShareModalProps {
  calculation: CalculationResponse;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ calculation, onClose }) => {
  const [copyFeedback, setCopyFeedback] = useState<'copied' | 'failed' | null>(null);
  const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => clearTimeout(copyFeedbackTimer.current);
  }, []);

  const shareUrl = generateShareUrl(calculation.id);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyFeedback('copied');
    } catch {
      setCopyFeedback('failed');
    }
    copyFeedbackTimer.current = setTimeout(() => setCopyFeedback(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Compartir presupuesto</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-2xl"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <button
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => shareViaWhatsApp(calculation, shareUrl)}
          >
            Compartir por WhatsApp
          </button>

          <button
            className="w-full bg-blue-400 text-white py-2 rounded-lg hover:bg-blue-500 transition-colors"
            onClick={() => shareViaEmail(calculation, shareUrl)}
          >
            Enviar por email
          </button>

          <button
            className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={handleCopyLink}
          >
            {copyFeedback === 'copied' && '✓ Enlace copiado'}
            {copyFeedback === 'failed' && 'No se pudo copiar'}
            {!copyFeedback && 'Copiar enlace'}
          </button>
        </div>

        <p className="text-xs text-gray-600 text-center mt-4">
          El enlace comparte un resumen del presupuesto. Abrirlo todavía no recupera
          el cálculo automáticamente — esa función llegará en una fase futura.
        </p>

        <button
          onClick={onClose}
          className="w-full mt-4 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
