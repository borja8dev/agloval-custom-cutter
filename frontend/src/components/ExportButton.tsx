import React, { useEffect, useRef, useState } from 'react';
import { CalculationResponse } from '../types';
import { exportToPDF, generateShareUrl } from '../services/export';
import { ShareModal } from './ShareModal';

interface ExportButtonProps {
  calculation: CalculationResponse | null;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ calculation }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<'copied' | 'failed' | null>(null);

  const pdfMessageTimer = useRef<ReturnType<typeof setTimeout>>();
  const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      clearTimeout(pdfMessageTimer.current);
      clearTimeout(copyFeedbackTimer.current);
    };
  }, []);

  if (!calculation) {
    return null;
  }

  const handleExportPDF = async () => {
    try {
      await exportToPDF(calculation);
    } catch (err) {
      setPdfMessage(
        err instanceof Error ? err.message : 'Exportación a PDF no disponible todavía'
      );
      pdfMessageTimer.current = setTimeout(() => setPdfMessage(null), 3000);
    }
  };

  const handleShare = () => {
    setShowShare(true);
    setShowMenu(false);
  };

  const handleCopyLink = async () => {
    const url = generateShareUrl(calculation.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback('copied');
    } catch {
      setCopyFeedback('failed');
    }
    copyFeedbackTimer.current = setTimeout(() => setCopyFeedback(null), 2000);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
          title="Exportar o compartir"
        >
          Compartir
          <span className={`transform transition-transform ${showMenu ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-52">
            <button
              onClick={handleExportPDF}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b text-sm"
            >
              {pdfMessage || 'Exportar como PDF'}
            </button>
            <button
              onClick={handleShare}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b text-sm"
            >
              Compartir presupuesto
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
            >
              {copyFeedback === 'copied' && '✓ Copiado'}
              {copyFeedback === 'failed' && 'No se pudo copiar'}
              {!copyFeedback && 'Copiar enlace'}
            </button>
          </div>
        )}
      </div>

      {showShare && (
        <ShareModal calculation={calculation} onClose={() => setShowShare(false)} />
      )}
    </>
  );
};
