import { QuoteSubmitRequestDTO, QuoteSubmitResponseDTO } from '../../dto/QuoteSubmit';

/** Input port: re-prices a quote and emails it to the customer (never to Agloval). */
export interface IQuoteSubmitUseCase {
  /**
   * @throws ProductNotFoundException / InvalidOrderLineException from the quote
   * @throws EmailDeliveryException when the email could not be sent
   */
  submit(request: QuoteSubmitRequestDTO): Promise<QuoteSubmitResponseDTO>;
}
