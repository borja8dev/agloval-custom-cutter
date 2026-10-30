import React, { useEffect } from 'react';

interface OrderBarProps {
  lineCount: number;
  totalText: string;
  onShowOrder: () => void;
}

// Reserves room at the end of the document (footer included) so the fixed bar
// never covers content; desktop hides the bar, so it needs no room there.
const BODY_SPACE_CLASSES = ['pb-[calc(5rem_+_env(safe-area-inset-bottom))]', 'lg:pb-0'];

/** Fixed summary of the order for phones and tablets (hidden from `lg` up). */
export const OrderBar: React.FC<OrderBarProps> = ({
  lineCount,
  totalText,
  onShowOrder,
}) => {
  useEffect(() => {
    document.body.classList.add(...BODY_SPACE_CLASSES);
    return () => document.body.classList.remove(...BODY_SPACE_CLASSES);
  }, []);

  const lines = lineCount === 1 ? '1 línea' : `${lineCount} líneas`;

  return (
    <div
      data-testid="order-bar"
      className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 pt-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-gray-700">
          <span className="font-bold text-brand-dark">Tu pedido</span>
          <span aria-hidden="true"> · </span>
          <span>{lines}</span>
          <span aria-hidden="true"> · </span>
          <span className="font-bold text-gray-900 tabular-nums whitespace-nowrap">
            {totalText}
          </span>
        </p>
        <button
          type="button"
          onClick={onShowOrder}
          className="shrink-0 min-h-[40px] bg-brand-dark text-white rounded-md px-4 py-2 text-sm font-medium hover:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Ver pedido
        </button>
      </div>
    </div>
  );
};
