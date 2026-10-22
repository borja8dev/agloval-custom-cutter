import { IOrderNotifier } from '../../application/ports/out/OrderNotifier';
import { LogOrderNotifier } from './LogOrderNotifier';
import { SmtpOrderNotifier, SmtpSettings } from './SmtpOrderNotifier';

export const DEFAULT_MAIL_FROM = 'Agloval · Gestor de pedidos <no-reply@agloval.test>';
const DEFAULT_SMTP_PORT = 1025; // Mailpit

type Env = Record<string, string | undefined>;

/** SMTP settings from the environment, or undefined when SMTP_HOST is not set. */
export function readSmtpSettings(env: Env): SmtpSettings | undefined {
  const host = env.SMTP_HOST?.trim();
  if (!host) return undefined;

  const rawPort = env.SMTP_PORT?.trim();
  const port = rawPort ? Number(rawPort) : DEFAULT_SMTP_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid SMTP_PORT: "${rawPort}"`);
  }

  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS;

  return {
    host,
    port,
    secure: env.SMTP_SECURE === 'true',
    auth: user && pass ? { user, pass } : undefined,
    from: env.MAIL_FROM?.trim() || DEFAULT_MAIL_FROM,
  };
}

/** SMTP when SMTP_HOST is set; otherwise a notifier that only logs. */
export function createOrderNotifier(env: Env): IOrderNotifier {
  const settings = readSmtpSettings(env);
  return settings ? SmtpOrderNotifier.fromSettings(settings) : new LogOrderNotifier();
}
