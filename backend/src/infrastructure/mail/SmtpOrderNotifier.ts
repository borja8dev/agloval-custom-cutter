import nodemailer, { SendMailOptions } from 'nodemailer';
import { IOrderNotifier, OrderMessage } from '../../application/ports/out/OrderNotifier';

/** The only part of a nodemailer transport the notifier needs (easy to fake in tests). */
export interface MailTransport {
  sendMail(options: SendMailOptions): Promise<unknown>;
}

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string } | undefined;
  from: string;
}

/** Sends order emails through any SMTP server (Mailpit in development). */
export class SmtpOrderNotifier implements IOrderNotifier {
  constructor(
    private transport: MailTransport,
    private from: string
  ) {}

  static fromSettings(settings: SmtpSettings): SmtpOrderNotifier {
    const transport = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.auth,
      // Fail fast so the customer is not left waiting on a dead mail server.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    return new SmtpOrderNotifier(transport, settings.from);
  }

  async send(message: OrderMessage): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    });
  }
}
