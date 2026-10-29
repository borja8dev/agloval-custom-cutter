import nodemailer from 'nodemailer';
import { SmtpOrderNotifier } from '../../../src/infrastructure/mail/SmtpOrderNotifier';
import { LogOrderNotifier } from '../../../src/infrastructure/mail/LogOrderNotifier';
import {
  DEFAULT_MAIL_FROM,
  createOrderNotifier,
  readSmtpSettings,
} from '../../../src/infrastructure/mail/createOrderNotifier';
import { OrderMessage } from '../../../src/application/ports/out/OrderNotifier';

const message: OrderMessage = {
  to: 'ana@example.com',
  subject: 'Hemos recibido tu solicitud · Pedido nº 3',
  html: '<p>Hola Ana</p>',
  text: 'Hola Ana',
  replyTo: 'pedidos@agloval.test',
};

describe('readSmtpSettings', () => {
  test('returns nothing without SMTP_HOST', () => {
    expect(readSmtpSettings({})).toBeUndefined();
    expect(readSmtpSettings({ SMTP_HOST: '  ' })).toBeUndefined();
  });

  test('applies the defaults for a local catcher', () => {
    expect(readSmtpSettings({ SMTP_HOST: 'localhost' })).toEqual({
      host: 'localhost',
      port: 1025,
      secure: false,
      auth: undefined,
      from: DEFAULT_MAIL_FROM,
    });
    expect(DEFAULT_MAIL_FROM).toBe('Agloval · Gestor de pedidos <no-reply@agloval.test>');
  });

  test('reads port, TLS, credentials and sender', () => {
    expect(
      readSmtpSettings({
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
        SMTP_USER: 'user',
        SMTP_PASS: 'secret',
        MAIL_FROM: 'Agloval <pedidos@example.com>',
      })
    ).toEqual({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: { user: 'user', pass: 'secret' },
      from: 'Agloval <pedidos@example.com>',
    });
  });

  test('treats anything but "true" as no TLS and ignores a user without password', () => {
    const settings = readSmtpSettings({ SMTP_HOST: 'h', SMTP_SECURE: 'yes', SMTP_USER: 'user' });
    expect(settings?.secure).toBe(false);
    expect(settings?.auth).toBeUndefined();
  });

  test('rejects an invalid port', () => {
    expect(() => readSmtpSettings({ SMTP_HOST: 'h', SMTP_PORT: 'abc' })).toThrow('SMTP_PORT');
  });
});

describe('createOrderNotifier', () => {
  test('logs instead of sending when SMTP_HOST is not set', () => {
    expect(createOrderNotifier({})).toBeInstanceOf(LogOrderNotifier);
  });

  test('uses SMTP when SMTP_HOST is set', () => {
    expect(createOrderNotifier({ SMTP_HOST: 'localhost' })).toBeInstanceOf(SmtpOrderNotifier);
  });
});

describe('SmtpOrderNotifier', () => {
  test('hands the whole message to the transport with the configured sender', async () => {
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const sendMail = jest.spyOn(transport, 'sendMail');
    const notifier = new SmtpOrderNotifier(transport, 'Agloval <no-reply@agloval.test>');

    await notifier.send(message);

    expect(sendMail).toHaveBeenCalledWith({
      from: 'Agloval <no-reply@agloval.test>',
      to: 'ana@example.com',
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: 'pedidos@agloval.test',
    });
    const info = (await sendMail.mock.results[0]?.value) as { message: string };
    const sent = JSON.parse(info.message) as { subject: string; to: Array<{ address: string }> };
    expect(sent.subject).toBe(message.subject);
    expect(sent.to[0]?.address).toBe('ana@example.com');
  });

  test('propagates transport failures', async () => {
    const transport = { sendMail: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) };
    const notifier = new SmtpOrderNotifier(transport, DEFAULT_MAIL_FROM);

    await expect(notifier.send(message)).rejects.toThrow('ECONNREFUSED');
  });
});

describe('LogOrderNotifier', () => {
  test('logs only the recipient domain and the subject', async () => {
    const log = jest.fn();
    const notifier = new LogOrderNotifier(log);

    await notifier.send(message);

    expect(log).toHaveBeenCalledTimes(1);
    const logged = log.mock.calls[0]?.join(' ') ?? '';
    expect(logged).toContain('@example.com');
    expect(logged).toContain(message.subject);
    expect(logged).not.toContain('ana@');
    expect(logged).not.toContain('Hola Ana');
  });

  test('drops the customer name that follows the order number in a subject', async () => {
    const log = jest.fn();
    const notifier = new LogOrderNotifier(log);

    await notifier.send({ ...message, subject: 'Nuevo pedido nº 3 · Ana García' });

    const logged = log.mock.calls[0]?.join(' ') ?? '';
    expect(logged).toContain('Nuevo pedido nº 3');
    expect(logged).not.toContain('Ana García');
  });

  test('drops the customer name and the reference that follow the order number', async () => {
    const log = jest.fn();
    const notifier = new LogOrderNotifier(log);

    await notifier.send({ ...message, subject: 'Nuevo pedido nº 3 · Ana García · Obra Mayor' });

    const logged = log.mock.calls[0]?.join(' ') ?? '';
    expect(logged).toContain('"Nuevo pedido nº 3"');
    expect(logged).not.toContain('Ana García');
    expect(logged).not.toContain('Obra Mayor');
  });

  test('keeps the whole quote subject, which has no personal data', async () => {
    const log = jest.fn();
    const notifier = new LogOrderNotifier(log);

    await notifier.send({ ...message, subject: 'Tu presupuesto · Presupuesto nº 5' });

    const logged = log.mock.calls[0]?.join(' ') ?? '';
    expect(logged).toContain('"Tu presupuesto · Presupuesto nº 5"');
  });
});
