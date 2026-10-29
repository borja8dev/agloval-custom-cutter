import { OrderQuoteRequestDTO, OrderQuoteResponseDTO } from './OrderQuote';
import { OrderCustomerDTO } from './OrderSubmit';

/**
 * Quote submission contract (POST /api/quotes/submit): the customer saves a
 * quote, the server re-prices it and emails it to the customer only. Agloval
 * hears about it once it becomes an order. Nothing is stored.
 */

export interface QuoteSubmitRequestDTO extends OrderQuoteRequestDTO {
  /** Per-browser quote number shown to the customer ("Presupuesto nº N"). */
  quoteNumber: number;
  customer: OrderCustomerDTO;
  /** The customer's own label for the job; already trimmed, absent when blank. */
  reference?: string;
  privacyAccepted: true;
}

/** A submitted quote priced by the server: what the email is built from. */
export interface SubmittedQuote {
  quoteNumber: number;
  customer: OrderCustomerDTO;
  reference?: string;
  quote: OrderQuoteResponseDTO;
}

export interface QuoteSubmitResponseDTO {
  quoteNumber: number;
  quote: OrderQuoteResponseDTO;
  emails: { customer: 'sent' };
}
