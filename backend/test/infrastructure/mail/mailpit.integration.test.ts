import { SmtpOrderNotifier } from '../../../src/infrastructure/mail/SmtpOrderNotifier';
import { DEFAULT_MAIL_FROM } from '../../../src/infrastructure/mail/createOrderNotifier';

/**
 * Sends a real email to a running Mailpit (`docker compose up -d mailpit`) and
 * reads it back from Mailpit's API. Skipped unless MAILPIT_URL is set, e.g.
 * MAILPIT_URL=http://localhost:8025 npx jest mailpit
 */
const mailpitUrl = process.env.MAILPIT_URL;
const describeWithMailpit = mailpitUrl ? describe : describe.skip;

interface MailpitMessage {
  Subject: string;
  To: Array<{ Address: string }>;
  ReplyTo: Array<{ Address: string }>;
}

async function findMessage(subject: string): Promise<MailpitMessage | undefined> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const response = await fetch(`${mailpitUrl}/api/v1/messages?limit=50`);
    const { messages } = (await response.json()) as { messages: MailpitMessage[] };
    const found = messages.find((m) => m.Subject === subject);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return undefined;
}

describeWithMailpit('SmtpOrderNotifier against Mailpit', () => {
  test('delivers the message to the local inbox', async () => {
    const notifier = SmtpOrderNotifier.fromSettings({
      host: process.env.SMTP_HOST || 'localhost',
      port: 1025,
      secure: false,
      auth: undefined,
      from: DEFAULT_MAIL_FROM,
    });
    const subject = `Prueba de integración · Pedido nº ${Date.now()}`;

    await notifier.send({
      to: 'cliente@example.com',
      subject,
      html: '<p>Hola</p>',
      text: 'Hola',
      replyTo: 'pedidos@agloval.test',
    });

    const message = await findMessage(subject);
    expect(message?.To[0]?.Address).toBe('cliente@example.com');
    expect(message?.ReplyTo[0]?.Address).toBe('pedidos@agloval.test');
  });
});
