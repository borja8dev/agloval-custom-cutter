import { OrderQuoteRequestDTO, OrderQuoteResponseDTO } from './OrderQuote';

/**
 * Order submission contract (POST /api/orders/submit): the customer confirms an
 * order, the server re-prices it and emails the quote. Nothing is stored yet.
 */

export interface OrderCustomerDTO {
  name: string;
  email: string;
  phone: string;
}

export interface OrderSubmitRequestDTO extends OrderQuoteRequestDTO {
  /** Per-browser order number shown to the customer ("Pedido nº N"). */
  orderNumber: number;
  customer: OrderCustomerDTO;
  /** The customer's own label for the job; already trimmed, absent when blank. */
  reference?: string;
  /** The quote this order was made from ("Pasar a pedido"). */
  fromQuoteNumber?: number;
  privacyAccepted: true;
}

/** A submitted order priced by the server: what the emails are built from. */
export interface SubmittedOrder {
  orderNumber: number;
  customer: OrderCustomerDTO;
  reference?: string;
  fromQuoteNumber?: number;
  quote: OrderQuoteResponseDTO;
}

export type EmailDeliveryStatus = 'sent' | 'skipped';

export interface OrderSubmitResponseDTO {
  orderNumber: number;
  quote: OrderQuoteResponseDTO;
  emails: {
    customer: 'sent';
    /** 'skipped' while no Agloval address is configured (ORDER_NOTIFICATION_EMAIL). */
    agloval: EmailDeliveryStatus;
  };
}
