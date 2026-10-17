import { OrderQuoteRequestDTO, OrderQuoteResponseDTO } from '../../dto/OrderQuote';

/** Input port: prices a whole multi-product order without persisting anything. */
export interface IOrderQuoteUseCase {
  /**
   * @throws ProductNotFoundException when a line references an unknown product
   * @throws InvalidOrderLineException when a line does not fit its product's unit
   */
  quote(request: OrderQuoteRequestDTO): Promise<OrderQuoteResponseDTO>;
}
