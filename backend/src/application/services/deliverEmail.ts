import { IOrderNotifier, OrderMessage } from '../ports/out/OrderNotifier';
import { EmailDeliveryException } from '../exceptions/ApplicationException';

/** Sends one message, turning any notifier failure into EmailDeliveryException (502). */
export async function deliverEmail(notifier: IOrderNotifier, message: OrderMessage): Promise<void> {
  try {
    await notifier.send(message);
  } catch (error) {
    // The cause stays in the server log; the client gets a generic Spanish message.
    console.error('Order email delivery failed:', error instanceof Error ? error.message : error);
    throw new EmailDeliveryException();
  }
}
