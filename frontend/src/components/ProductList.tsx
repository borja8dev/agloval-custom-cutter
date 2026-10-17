import React from 'react';
import type { CatalogProduct } from '../types';
import { Alert } from './Alert';
import { formatProductMeasure, formatProductPrice, unitLabel } from '../utils/formatters';

interface ProductListProps {
  products: CatalogProduct[];
  selectedId: string | null;
  onSelect: (product: CatalogProduct) => void;
  countsByProduct: Record<string, number>;
  isLoading?: boolean;
  error?: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  total?: number;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  selectedId,
  onSelect,
  countsByProduct,
  isLoading = false,
  error = null,
  query,
  onQueryChange,
  total,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent, product: CatalogProduct) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(product);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="product-search" className="block text-sm font-medium text-gray-700 mb-1">
          Buscar producto
        </label>
        <input
          id="product-search"
          type="search"
          data-testid="product-search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Nombre o referencia"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <Alert type="error" message={error} />}
      {isLoading && <p className="text-sm text-gray-600">Cargando productos...</p>}
      {!isLoading && !error && products.length === 0 && (
        <p className="text-sm text-gray-600">No hay productos para este filtro</p>
      )}

      {products.length > 0 && (
        <div
          role="listbox"
          aria-label="Productos"
          data-testid="product-list"
          className="max-h-80 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100"
        >
          {products.map((product) => {
            const selected = product.id === selectedId;
            const count = countsByProduct[product.id] ?? 0;
            const measure = formatProductMeasure(product);
            return (
              <div
                key={product.id}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                data-testid="product-item"
                onClick={() => onSelect(product)}
                onKeyDown={(e) => handleKeyDown(e, product)}
                className={`p-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                  selected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <span className="shrink-0 text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5">
                    {unitLabel(product.unit)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{product.sku}</p>
                <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm text-gray-700">
                  <span data-testid="product-measure">{measure}</span>
                  <span data-testid="product-price" className="font-mono font-semibold text-green-700">
                    {formatProductPrice(product)}
                  </span>
                </div>
                {count > 0 && (
                  <span
                    data-testid="in-order-badge"
                    className="inline-block mt-1 text-xs bg-green-100 text-green-800 rounded px-2 py-0.5"
                  >
                    {count} en el pedido
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {total !== undefined && total > products.length && (
        <p className="text-xs text-gray-500">
          Mostrando {products.length} de {total}
        </p>
      )}
    </div>
  );
};
