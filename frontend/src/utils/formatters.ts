import type { CatalogProduct, ProductUnit } from '../types';

export function formatCurrency(value: number, currency: string = 'EUR'): string {
  const symbol = currency === 'EUR' ? '€' : `${currency} `;
  return `${symbol}${value.toFixed(2)}`;
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

export function formatArea(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)} m²`;
}

export function formatDimensions(width: number, height: number): string {
  return `${width} × ${height} cm`;
}

export function formatWaste(percentage: number): {
  text: string;
  level: 'low' | 'medium' | 'high';
} {
  if (percentage < 20) {
    return { text: `${percentage.toFixed(1)}% (excelente)`, level: 'low' };
  }
  if (percentage < 50) {
    return { text: `${percentage.toFixed(1)}% (bueno)`, level: 'medium' };
  }
  return { text: `${percentage.toFixed(1)}% (alto)`, level: 'high' };
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
}

export function formatTimeAgo(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Hace poco';
  if (diffMins < 60) return `Hace ${diffMins}m`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;

  return formatDate(dateObj);
}

// Spanish-style decimal number (comma separator), independent of ICU data.
export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals).replace('.', ',');
}

const UNIT_LABELS: Record<ProductUnit, string> = {
  M2: 'Tablero',
  UD: 'Unidad',
  ML: 'Barra',
};

export function unitLabel(unit: ProductUnit): string {
  return UNIT_LABELS[unit];
}

// Fixed measure of a catalog product: board size (+ thickness) for M2, bar
// length in metres for ML, nothing for UD.
export function formatProductMeasure(product: CatalogProduct): string {
  if (product.unit === 'M2' && product.standardWidth !== null && product.standardHeight !== null) {
    const size = `${product.standardWidth} x ${product.standardHeight} cm`;
    return product.thickness !== null ? `${size} · ${product.thickness} mm` : size;
  }
  if (product.unit === 'ML' && product.lengthCm !== null) {
    return `${formatDecimal(product.lengthCm / 100)} m`;
  }
  return '';
}

export function formatProductPrice(product: CatalogProduct): string {
  switch (product.unit) {
    case 'M2':
      return product.pricePerM2 !== null
        ? `${formatDecimal(product.pricePerM2)} EUR/m2`
        : `${formatDecimal(product.pricePerUnit)} EUR/tablero`;
    case 'ML':
      return `${formatDecimal(product.pricePerUnit)} EUR/m`;
    default:
      return `${formatDecimal(product.pricePerUnit)} EUR/ud`;
  }
}
