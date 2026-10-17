import type { OrderQuote, QuoteBoardGroup, QuoteGroup } from '../types';
import { formatDecimal } from '../utils/formatters';

const money = (value: number, currency: string) => `${formatDecimal(value)} ${currency}`;

function describeBoardGroup(group: QuoteBoardGroup, currency: string): string {
  const boards = `${group.boardsNeeded} ${group.boardsNeeded === 1 ? 'tablero' : 'tableros'}`;
  const { boardWidth, boardHeight } = group.product;
  const size = boardWidth !== null && boardHeight !== null ? ` de ${boardWidth} x ${boardHeight} cm` : '';
  const calculation = `${formatDecimal(group.usedAreaM2)} m² usados · ${boards}${size}\n  ${boards} x ${money(group.pricePerBoard, currency)} = ${money(group.price, currency)}`;
  return `${group.product.name}: ${calculation}`;
}

function describeGroup(group: QuoteGroup, currency: string): string {
  const name = group.product.name;
  switch (group.kind) {
    case 'BOARD':
      return describeBoardGroup(group, currency);
    case 'UNIT':
      return `${name}: ${group.quantity} x ${money(group.unitPrice, currency)} = ${money(group.price, currency)}`;
    case 'LINEAR':
      return `${name}: ${group.quantity} ${group.quantity === 1 ? 'barra' : 'barras'} de ${formatDecimal(group.lengthM)} m = ${money(group.price, currency)}`;
  }
}

// Plain-text summary of a quote, shared by every export/share channel.
export function buildOrderText(quote: OrderQuote): string {
  const lines = quote.groups.map((group) => `- ${describeGroup(group, quote.currency)}`);
  return [
    'Presupuesto de pedido Agloval',
    '',
    ...lines,
    '',
    `Total: ${money(quote.total, quote.currency)}`
  ].join('\n');
}

export async function exportToPDF(_quote: OrderQuote): Promise<void> {
  throw new Error('PDF export requires the jsPDF dependency — planned for Fase D');
}

export function shareViaWhatsApp(quote: OrderQuote): void {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(buildOrderText(quote))}`;
  window.open(whatsappUrl, '_blank');
}

export function shareViaEmail(quote: OrderQuote): void {
  const subject = encodeURIComponent('Presupuesto de pedido Agloval');
  const body = encodeURIComponent(`Hola,\n\nTe envío el presupuesto:\n\n${buildOrderText(quote)}\n\nSaludos,\nAgloval`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}
