/** One email, already rendered. Adapters decide how (or whether) it is delivered. */
export interface OrderMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/** Output port: delivers order emails (SMTP in real environments, a log otherwise). */
export interface IOrderNotifier {
  /** @throws any error when the message could not be delivered */
  send(message: OrderMessage): Promise<void>;
}
