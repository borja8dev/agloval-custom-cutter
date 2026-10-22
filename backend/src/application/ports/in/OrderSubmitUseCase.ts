import { OrderSubmitRequestDTO, OrderSubmitResponseDTO } from '../../dto/OrderSubmit';

/** Input port: re-prices a confirmed order and emails the quote. */
export interface IOrderSubmitUseCase {
  /**
   * @throws ProductNotFoundException / InvalidOrderLineException from the quote
   * @throws EmailDeliveryException when an email could not be sent
   */
  submit(request: OrderSubmitRequestDTO): Promise<OrderSubmitResponseDTO>;
}
