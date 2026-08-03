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
