import { IOrderSubmitUseCase } from '../ports/in/OrderSubmitUseCase';
import { IOrderQuoteUseCase } from '../ports/in/OrderQuoteUseCase';
import { IOrderNotifier, OrderMessage } from '../ports/out/OrderNotifier';
import {
  EmailDeliveryStatus,
  OrderSubmitRequestDTO,
  OrderSubmitResponseDTO,
  SubmittedOrder,
} from '../dto/OrderSubmit';
import { buildAglovalEmail, buildCustomerEmail } from '../notifications/orderEmails';
import { EmailDeliveryException } from '../exceptions/ApplicationException';

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
      quote,
    };

    let agloval: EmailDeliveryStatus = 'skipped';
    if (this.aglovalEmail) {
      await this.deliver({ to: this.aglovalEmail, ...buildAglovalEmail(order) });
      agloval = 'sent';
    }
    await this.deliver({ to: order.customer.email, ...buildCustomerEmail(order) });

    return { orderNumber: order.orderNumber, quote, emails: { customer: 'sent', agloval } };
  }

  private async deliver(message: OrderMessage): Promise<void> {
    try {
      await this.notifier.send(message);
    } catch (error) {
      // The cause stays in the server log; the client gets a generic Spanish message.
      console.error('Order email delivery failed:', error instanceof Error ? error.message : error);
      throw new EmailDeliveryException();
    }
  }
}
