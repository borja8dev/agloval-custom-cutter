import { IOrderNotifier, OrderMessage } from '../../application/ports/out/OrderNotifier';

type Log = (...args: unknown[]) => void;

/**
 * Used when no SMTP server is configured: sends nothing and logs only the
 * recipient domain and the subject up to the order number. Agloval's subject
 * puts the customer's name after the number ("Nuevo pedido nº 3 · Ana"), so
 * whatever follows the number is dropped to keep personal data out of the logs.
 */
export class LogOrderNotifier implements IOrderNotifier {
  constructor(private log: Log = console.info) {}

  async send(message: OrderMessage): Promise<void> {
    const domain = message.to.slice(message.to.lastIndexOf('@'));
    this.log(
      `[mail disabled] Not sent to *${domain}: "${subjectWithoutPersonalData(message.subject)}"`
    );
  }
}

function subjectWithoutPersonalData(subject: string): string {
  const parts = subject.split(' · ');
  const numbered = parts.findIndex((part) => /nº \d+/.test(part));
  return parts.slice(0, numbered === -1 ? 1 : numbered + 1).join(' · ');
}
