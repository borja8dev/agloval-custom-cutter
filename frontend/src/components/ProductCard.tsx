import React from 'react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  isSelected?: boolean;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSelected = false,
  onSelect
}) => {
  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400'
      }`}
      onClick={() => onSelect(product)}
      data-testid="product-card"
    >
      <div className="mb-2">
        <h3 className="text-lg font-semibold">{product.name}</h3>
        <p className="text-sm text-gray-600">{product.categoryName}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
        <div>
          <p className="text-gray-600">Ancho</p>
          <p className="font-mono font-bold">{product.standardWidth} cm</p>
        </div>
        <div>
          <p className="text-gray-600">Alto</p>
          <p className="font-mono font-bold">{product.standardHeight} cm</p>
        </div>
        <div>
          <p className="text-gray-600">Grosor</p>
          <p className="font-mono font-bold">{product.thickness} mm</p>
        </div>
      </div>

      <div className="border-t pt-2">
        <p className="text-2xl font-bold text-green-600">
          €{product.pricePerUnit.toFixed(2)}
        </p>
        <p className="text-xs text-gray-500">por unidad</p>
      </div>

      {isSelected && (
        <div className="mt-2 text-center text-blue-600 font-semibold text-sm">
          ✓ Seleccionado
        </div>
      )}
    </div>
  );
};
