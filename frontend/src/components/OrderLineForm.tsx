import React, { useState } from 'react';
import type { CatalogProduct, OrderPiece } from '../types';
import {
  MAX_LINE_QUANTITY,
  MAX_PIECE_QUANTITY,
  MIN_PIECE_HEIGHT_CM,
  MIN_PIECE_WIDTH_CM,
} from '../constants';
import { formatProductMeasure } from '../utils/formatters';

interface OrderLineFormProps {
  product: CatalogProduct | null;
  onAddPiece: (piece: OrderPiece) => void;
  onAddQuantity: (quantity: number) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
const buttonClass =
  'w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition-colors';

const isIntegerBetween = (value: number, min: number, max: number) =>
  Number.isInteger(value) && value >= min && value <= max;

const Messages: React.FC<{ messages: string[] }> = ({ messages }) => (
  <div aria-live="polite" className={messages.length ? 'space-y-1' : undefined}>
    {messages.map((message) => (
      <p key={message} className="text-sm text-red-600 bg-red-50 p-2 rounded">
        {message}
      </p>
    ))}
  </div>
);

const BoardForm: React.FC<{
  product: CatalogProduct;
  onAddPiece: (piece: OrderPiece) => void;
}> = ({ product, onAddPiece }) => {
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found: string[] = [];
    const w = width.trim() === '' ? NaN : Number(width);
    const h = height.trim() === '' ? NaN : Number(height);
    const q = quantity.trim() === '' ? NaN : Number(quantity);
    const maxW = product.standardWidth ?? Infinity;
    const maxH = product.standardHeight ?? Infinity;

    if (Number.isNaN(w)) found.push('Introduce el ancho');
    else if (w < MIN_PIECE_WIDTH_CM) found.push(`El ancho mínimo es ${MIN_PIECE_WIDTH_CM} cm`);
    else if (w > maxW) found.push(`El ancho máximo es ${maxW} cm`);

    if (Number.isNaN(h)) found.push('Introduce el alto');
    else if (h < MIN_PIECE_HEIGHT_CM) found.push(`El alto mínimo es ${MIN_PIECE_HEIGHT_CM} cm`);
    else if (h > maxH) found.push(`El alto máximo es ${maxH} cm`);

    if (!isIntegerBetween(q, 1, MAX_PIECE_QUANTITY)) {
      found.push(`La cantidad debe ser un entero entre 1 y ${MAX_PIECE_QUANTITY}`);
    }

    setErrors(found);
    if (found.length > 0) return;

    onAddPiece({ width: w, height: h, quantity: q });
    setWidth('');
    setHeight('');
    setQuantity('1');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="piece-width" className={labelClass}>
            Ancho (cm)
          </label>
          <input
            id="piece-width"
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className={inputClass}
            data-testid="width-input"
          />
        </div>
        <div>
          <label htmlFor="piece-height" className={labelClass}>
            Alto (cm)
          </label>
          <input
            id="piece-height"
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className={inputClass}
            data-testid="height-input"
          />
        </div>
      </div>
      <div>
        <label htmlFor="piece-quantity" className={labelClass}>
          Cantidad de piezas iguales
        </label>
        <input
          id="piece-quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className={inputClass}
          data-testid="quantity-input"
        />
      </div>
      <Messages messages={errors} />
      <button type="submit" className={buttonClass} data-testid="add-piece-btn">
        Añadir pieza
      </button>
    </form>
  );
};

const QuantityForm: React.FC<{
  product: CatalogProduct;
  onAddQuantity: (quantity: number) => void;
}> = ({ product, onAddQuantity }) => {
  const [quantity, setQuantity] = useState('1');
  const [errors, setErrors] = useState<string[]>([]);
  const measure = product.unit === 'ML' ? formatProductMeasure(product) : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quantity.trim() === '' ? NaN : Number(quantity);
    if (!isIntegerBetween(q, 1, MAX_LINE_QUANTITY)) {
      setErrors([`La cantidad debe ser un entero entre 1 y ${MAX_LINE_QUANTITY}`]);
      return;
    }
    setErrors([]);
    onAddQuantity(q);
    setQuantity('1');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {measure && <p className="text-sm text-gray-700">Medida fija: {measure}</p>}
      <div>
        <label htmlFor="line-quantity" className={labelClass}>
          Cantidad
        </label>
        <input
          id="line-quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className={inputClass}
          data-testid="quantity-input"
        />
      </div>
      <Messages messages={errors} />
      <button type="submit" className={buttonClass} data-testid="add-line-btn">
        Añadir al pedido
      </button>
    </form>
  );
};

export const OrderLineForm: React.FC<OrderLineFormProps> = ({
  product,
  onAddPiece,
  onAddQuantity,
}) => {
  if (!product) {
    return <p className="text-sm text-gray-600">Selecciona un producto para añadirlo al pedido</p>;
  }
  // Keyed by product so switching product resets the local form state.
  return product.unit === 'M2' ? (
    <BoardForm key={product.id} product={product} onAddPiece={onAddPiece} />
  ) : (
    <QuantityForm key={product.id} product={product} onAddQuantity={onAddQuantity} />
  );
};
