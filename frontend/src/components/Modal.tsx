import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg';
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const sizeClass = { md: 'max-w-md', lg: 'max-w-2xl' };

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, size = 'md' }) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Read inside the effects so a new onClose identity does not reset the focus.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    if (panel) {
      const [first] = focusableIn(panel);
      (first ?? panel).focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !panelRef.current) return;
    const items = focusableIn(panelRef.current);
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      data-testid="modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className={`flex w-full ${sizeClass[size]} max-h-full flex-col bg-white rounded-lg shadow-xl focus:outline-none`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3 sm:px-6">
          <h2 id={titleId} className="text-xl font-bold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-gray-600 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
      </div>
    </div>,
    document.body
  );
};
