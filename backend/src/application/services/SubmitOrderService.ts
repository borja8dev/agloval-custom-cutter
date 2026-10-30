import { IOrderSubmitUseCase } from '../ports/in/OrderSubmitUseCase';
import { IOrderQuoteUseCase } from '../ports/in/OrderQuoteUseCase';
import { IOrderNotifier } from '../ports/out/OrderNotifier';
import {
  EmailDeliveryStatus,
  OrderSubmitRequestDTO,
  OrderSubmitResponseDTO,
  SubmittedOrder,
} from '../dto/OrderSubmit';
import { buildAglovalEmail, buildCustomerEmail } from '../notifications/orderEmails';
import { deliverEmail } from './deliverEmail';

export interface SubmitOrderOptions {
  /** Where Agloval receives new orders. Unset or blank: no Agloval email is sent. */
  aglovalEmail?: string;
}

/**
 * Confirms an order: prices it again on the server (client prices are never
 * trusted), emails Agloval when an address is configured, then the customer.
 * Agloval goes first so a customer only gets a confirmation for an order
 * Agloval has actually received.
 */
export class SubmitOrderService implements IOrderSubmitUseCase {
  private readonly aglovalEmail: string | undefined;

  constructor(
    private quoteUseCase: IOrderQuoteUseCase,
    private notifier: IOrderNotifier,
    options: SubmitOrderOptions
  ) {
    this.aglovalEmail = options.aglovalEmail?.trim() || undefined;
  }

  async submit(request: OrderSubmitRequestDTO): Promise<OrderSubmitResponseDTO> {
    const quote = await this.quoteUseCase.quote({ lines: request.lines });
    const order: SubmittedOrder = {
      orderNumber: request.orderNumber,
      customer: request.customer,
      reference: request.reference,
      fromQuoteNumber: request.fromQuoteNumber,
      quote,
    };

    let agloval: EmailDeliveryStatus = 'skipped';
    if (this.aglovalEmail) {
      await deliverEmail(this.notifier, { to: this.aglovalEmail, ...buildAglovalEmail(order) });
      agloval = 'sent';
    }
    await deliverEmail(this.notifier, { to: order.customer.email, ...buildCustomerEmail(order) });

    return { orderNumber: order.orderNumber, quote, emails: { customer: 'sent', agloval } };
  }
}
