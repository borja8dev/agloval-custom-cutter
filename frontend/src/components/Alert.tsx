import React from 'react';

interface AlertProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
}

const alertStyles = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: '✓'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: '✕'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'ℹ'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: '⚠'
  }
};

export const Alert: React.FC<AlertProps> = ({ type, message, onClose, autoClose = false }) => {
  const style = alertStyles[type];

  // Read the latest onClose via a ref instead of depending on it directly —
  // callers typically pass a fresh inline function each render, which would
  // otherwise reset this timer on every unrelated re-render of the page.
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (!autoClose) {
      return undefined;
    }
    const timer = setTimeout(() => onCloseRef.current?.(), 5000);
    return () => clearTimeout(timer);
  }, [autoClose]);

  return (
    <div
      className={`${style.bg} ${style.border} ${style.text} border rounded-lg p-4 flex items-center justify-between`}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold">{style.icon}</span>
        <p className="font-medium">{message}</p>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className={`${style.text} hover:opacity-70 text-lg`}
          aria-label="Cerrar"
        >
          ✕
        </button>
      )}
    </div>
  );
};
