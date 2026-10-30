import { IQuoteSubmitUseCase } from '../ports/in/QuoteSubmitUseCase';
import { IOrderQuoteUseCase } from '../ports/in/OrderQuoteUseCase';
import { IOrderNotifier } from '../ports/out/OrderNotifier';
import { QuoteSubmitRequestDTO, QuoteSubmitResponseDTO, SubmittedQuote } from '../dto/QuoteSubmit';
import { buildQuoteEmail } from '../notifications/orderEmails';
import { deliverEmail } from './deliverEmail';

/**
 * Saves a quote for the customer: prices it again on the server (client prices
 * are never trusted) and emails it to the customer only. It takes no Agloval
 * address on purpose: a quote reaches Agloval only once it becomes an order.
 */
export class SubmitQuoteService implements IQuoteSubmitUseCase {
  constructor(
    private quoteUseCase: IOrderQuoteUseCase,
    private notifier: IOrderNotifier
  ) {}

  async submit(request: QuoteSubmitRequestDTO): Promise<QuoteSubmitResponseDTO> {
    const quote = await this.quoteUseCase.quote({ lines: request.lines });
    const submitted: SubmittedQuote = {
      quoteNumber: request.quoteNumber,
      customer: request.customer,
      reference: request.reference,
      quote,
    };

    await deliverEmail(this.notifier, {
      to: submitted.customer.email,
      ...buildQuoteEmail(submitted),
    });

    return { quoteNumber: submitted.quoteNumber, quote, emails: { customer: 'sent' } };
  }
}
