import { SubmittedOrder } from '../dto/OrderSubmit';
import { SubmittedQuote } from '../dto/QuoteSubmit';
import { OrderQuoteGroupDTO, OrderQuoteResponseDTO } from '../dto/OrderQuote';

/**
 * Pure builders for the order and quote emails (Spanish copy). Every
 * customer-provided string and product name is HTML-escaped; the plain-text
 * versions are raw.
 */

export interface OrderEmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface AglovalEmailContent extends OrderEmailContent {
  replyTo: string;
}

const BRAND_COLOUR = '#00628F';
const SIGNATURE = 'Agloval · Aglomerados Valencia S.L.';
const REVIEW_NOTICE = 'Agloval revisará tu pedido y te confirmará la disponibilidad y la entrega.';
const QUOTE_NOTICE =
  'Precios según la tarifa vigente. Agloval te confirmará disponibilidad y entrega ' +
  'cuando lo pases a pedido.';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\u0027': '&#39;', // apostrophe
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/** Spanish decimals with dot thousands: 1317.04 -> "1.317,04". */
function formatDecimal(value: number, decimals: number = 2): string {
  const [integer = '0', fraction] = Math.abs(value).toFixed(decimals).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = value < 0 ? '-' : '';
  return fraction === undefined ? `${sign}${grouped}` : `${sign}${grouped},${fraction}`;
}

export function formatEuros(value: number): string {
  return `${formatDecimal(value)} €`;
}

/** "1 tablero", "6 tableros". */
const count = (amount: number, singular: string, plural: string): string =>
  `${amount} ${amount === 1 ? singular : plural}`;

interface BreakdownRow {
  name: string;
  detail: string;
  price: string;
}

function toRow(group: OrderQuoteGroupDTO): BreakdownRow {
  const price = formatEuros(group.price);
  switch (group.kind) {
    case 'BOARD':
      return {
        name: group.product.name,
        detail:
          `${count(group.pieceCount, 'pieza', 'piezas')}, ${formatDecimal(group.usedAreaM2)} m² · ` +
          `${count(group.boardsNeeded, 'tablero', 'tableros')} × ${formatEuros(group.pricePerBoard)}`,
        price,
      };
    case 'UNIT':
      return {
        name: group.product.name,
        detail: `${group.quantity} uds. × ${formatEuros(group.unitPrice)}`,
        price,
      };
    case 'LINEAR':
      return {
        name: group.product.name,
        detail:
          `${count(group.quantity, 'barra', 'barras')} × ${formatDecimal(group.lengthM)} m × ` +
          `${formatEuros(group.pricePerMeter)}/m`,
        price,
      };
  }
}

function breakdownText(quote: OrderQuoteResponseDTO): string {
  const lines = quote.groups.map(toRow).map((row) => `- ${row.name}: ${row.detail} = ${row.price}`);
  return [...lines, '', `Total: ${formatEuros(quote.total)}`].join('\n');
}

const CELL = 'padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:top;';

function breakdownHtml(quote: OrderQuoteResponseDTO): string {
  const rows = quote.groups
    .map(toRow)
    .map(
      (row) =>
        `<tr><td style="${CELL}"><strong>${escapeHtml(row.name)}</strong><br>` +
        `<span style="color:#475569;">${escapeHtml(row.detail)}</span></td>` +
        `<td style="${CELL}text-align:right;white-space:nowrap;">${escapeHtml(row.price)}</td></tr>`
    )
    .join('');
  return (
    '<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">' +
    `${rows}<tr><td style="padding:8px;font-weight:bold;">Total</td>` +
    '<td style="padding:8px;font-weight:bold;text-align:right;white-space:nowrap;">' +
    `${escapeHtml(formatEuros(quote.total))}</td></tr></table>`
  );
}

/** "Referencia: X" and "Desde el presupuesto nº M", only for what is present. */
function contextLines(doc: { reference?: string; fromQuoteNumber?: number }): string[] {
  const lines: string[] = [];
  if (doc.reference) lines.push(`Referencia: ${doc.reference}`);
  if (doc.fromQuoteNumber !== undefined) {
    lines.push(`Desde el presupuesto nº ${doc.fromQuoteNumber}`);
  }
  return lines;
}

/** The context lines as text paragraphs: a trailing blank line when there are any. */
const contextText = (lines: string[]): string[] => (lines.length ? [...lines, ''] : []);

const contextHtml = (lines: string[]): string =>
  lines.map((line) => `<p style="margin:4px 0;">${escapeHtml(line)}</p>`).join('');

function layout(heading: string, body: string): string {
  return (
    '<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f8fafc;">' +
    '<div style="max-width:600px;margin:0 auto;background:#ffffff;padding:24px;' +
    'font-family:Arial,Helvetica,sans-serif;color:#0f172a;">' +
    `<h1 style="color:${BRAND_COLOUR};font-size:20px;margin:0 0 16px;">${escapeHtml(heading)}</h1>` +
    `${body}<p style="margin-top:24px;color:#475569;">${escapeHtml(SIGNATURE)}</p></div></body></html>`
  );
}

const sectionHeading = (title: string): string =>
  `<h2 style="color:${BRAND_COLOUR};font-size:16px;margin:16px 0 8px;">${escapeHtml(title)}</h2>`;

/** Shared shape of the two customer emails: greeting, context, breakdown, notice. */
function customerEmail(
  heading: string,
  intro: string,
  context: string[],
  quote: OrderQuoteResponseDTO,
  notice: string
): Omit<OrderEmailContent, 'subject'> {
  const text = [
    heading,
    '',
    intro,
    '',
    ...contextText(context),
    breakdownText(quote),
    '',
    notice,
    '',
    SIGNATURE,
  ].join('\n');

  const html = layout(
    heading,
    `<p>${escapeHtml(intro)}</p>${contextHtml(context)}` +
      `${sectionHeading('Resumen')}${breakdownHtml(quote)}` +
      `<p style="margin-top:16px;">${escapeHtml(notice)}</p>`
  );

  return { html, text };
}

export function buildCustomerEmail(order: SubmittedOrder): OrderEmailContent {
  const heading = `Pedido nº ${order.orderNumber}`;
  const intro = `Hola ${order.customer.name}, hemos recibido tu solicitud. Este es el resumen de tu pedido:`;
  return {
    subject: `Hemos recibido tu solicitud · Pedido nº ${order.orderNumber}`,
    ...customerEmail(heading, intro, contextLines(order), order.quote, REVIEW_NOTICE),
  };
}

/** Sent to the customer only: Agloval hears about a quote once it becomes an order. */
export function buildQuoteEmail(quote: SubmittedQuote): OrderEmailContent {
  const heading = `Presupuesto nº ${quote.quoteNumber}`;
  const intro = `Hola ${quote.customer.name}, este es tu presupuesto:`;
  return {
    subject: `Tu presupuesto · Presupuesto nº ${quote.quoteNumber}`,
    ...customerEmail(heading, intro, contextLines(quote), quote.quote, QUOTE_NOTICE),
  };
}

export function buildAglovalEmail(order: SubmittedOrder): AglovalEmailContent {
  const { name, email, phone } = order.customer;
  const heading = `Nuevo pedido nº ${order.orderNumber}`;
  const context = contextLines(order);
  const contact: Array<[string, string]> = [
    ['Nombre', name],
    ['Correo', email],
    ['Teléfono', phone],
  ];

  const text = [
    heading,
    '',
    'Cliente',
    ...contact.map(([label, value]) => `${label}: ${value}`),
    '',
    'Pedido',
    ...context,
    breakdownText(order.quote),
    '',
    'Responde a este correo para escribir directamente al cliente.',
  ].join('\n');

  const contactRows = contact
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 8px 4px 0;color:#475569;">${escapeHtml(label)}</td>` +
        `<td style="padding:4px 0;">${escapeHtml(value)}</td></tr>`
    )
    .join('');

  const html = layout(
    heading,
    `${sectionHeading('Cliente')}` +
      `<table role="presentation" style="border-collapse:collapse;font-size:14px;">${contactRows}</table>` +
      `${sectionHeading('Pedido')}${contextHtml(context)}${breakdownHtml(order.quote)}` +
      '<p style="margin-top:16px;color:#475569;">' +
      'Responde a este correo para escribir directamente al cliente.</p>'
  );

  // The subject is plain text: the reference helps Agloval find the order in the inbox.
  const subject = [heading, name, order.reference].filter(Boolean).join(' · ');
  return { subject, html, text, replyTo: email };
}
