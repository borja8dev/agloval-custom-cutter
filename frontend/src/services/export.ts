import { CalculationResponse } from '../types';

export async function exportToPDF(_calculation: CalculationResponse): Promise<void> {
  throw new Error('PDF export requires the jsPDF dependency — planned for Fase D');
}

export function shareViaWhatsApp(calculation: CalculationResponse, shareUrl: string): void {
  const message = `
Presupuesto de corte personalizado
Producto: ${calculation.product.name}
Precio: €${calculation.pricing.totalPrice.toFixed(2)}
Tableros necesarios: ${calculation.calculation.boardsNeeded.toFixed(1)}
Ver detalles: ${shareUrl}
  `.trim();

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
}

export function shareViaEmail(calculation: CalculationResponse, shareUrl: string): void {
  const subject = `Presupuesto - ${calculation.product.name}`;
  const body = `
Hola,

Te envío el presupuesto de corte personalizado:

Producto: ${calculation.product.name}
Precio Total: €${calculation.pricing.totalPrice.toFixed(2)}
Tableros necesarios: ${calculation.calculation.boardsNeeded.toFixed(1)}

Más detalles: ${shareUrl}

Saludos,
Agloval
  `.trim();

  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  const mailtoUrl = `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
  window.location.href = mailtoUrl;
}

export function generateShareUrl(calculationId: string): string {
  return `${window.location.origin}?calc=${calculationId}`;
}
